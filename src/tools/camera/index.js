import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import NodeWebcam from 'node-webcam';

export default async function (program, toolName) {
    program.description('Capture photos from system webcam');

    program
        .command('capture [filename]')
        .description('Take a photo using the webcam')
        .action(async (filename) => {
            const homeDir = os.homedir();
            const toolDir = path.join(homeDir, '.zero-ops', toolName);
            if (!fs.existsSync(toolDir)) {
                fs.mkdirSync(toolDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let finalName = filename || `photo-${timestamp}.jpg`;

            // Security: Sanitize filename to prevent path traversal or shell injection
            // Allow only alphanumeric, dashes, underscores, dots.
            finalName = finalName.replace(/[^a-zA-Z0-9._-]/g, '_');

            const filePath = path.join(toolDir, finalName);
            // node-webcam appends extension if missing, but let's be explicit
            const savePath = filePath.replace(/\.jpg$/i, '');

            const platform = os.platform();

            // Native Helper Functions
            const captureMacNative = async (savePath) => {
                // Swift script to capture photo using AVFoundation
                const swiftScript = `
import AVFoundation
import AppKit

let dispatchGroup = DispatchGroup()
dispatchGroup.enter()

class CaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    let outputPath: String
    
    init(outputPath: String) {
        self.outputPath = outputPath
    }
    
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            print("Error capturing photo: \\(error)")
            exit(1)
        }
        
        guard let data = photo.fileDataRepresentation() else {
            print("Error: No photo data")
            exit(1)
        }
        
        let url = URL(fileURLWithPath: self.outputPath)
        do {
            try data.write(to: url)
            print("Photo saved to \\(self.outputPath)")
            exit(0)
        } catch {
            print("Error saving file: \\(error)")
            exit(1)
        }
    }
}

let session = AVCaptureSession()
session.sessionPreset = .photo

guard let device = AVCaptureDevice.default(for: .video),
      let input = try? AVCaptureDeviceInput(device: device) else {
    print("Error: No camera found or access denied")
    exit(1)
}

if session.canAddInput(input) {
    session.addInput(input)
}

let output = AVCapturePhotoOutput()
if session.canAddOutput(output) {
    session.addOutput(output)
}

session.startRunning()

// Give camera time to adjust light
Thread.sleep(forTimeInterval: 1.0)

let settings = AVCapturePhotoSettings()
let delegate = CaptureDelegate(outputPath: "${savePath}.jpg")

output.capturePhoto(with: settings, delegate: delegate)

dispatchMain()
                `;

                const scriptPath = path.join(os.tmpdir(), 'capture.swift');
                fs.writeFileSync(scriptPath, swiftScript);

                return new Promise((resolve, reject) => {
                    exec(`swift "${scriptPath}"`, (err, stdout, stderr) => {
                        fs.unlinkSync(scriptPath); // Clean up
                        if (err) {
                            reject(new Error(stderr || err.message));
                        } else {
                            console.log(stdout.trim());
                            resolve();
                        }
                    });
                });
            };

            const captureWinNative = async (savePath) => {
                // PowerShell script with embedded C# to use avicap32.dll
                // This is a "best effort" native capture for Windows using standard libraries.
                const psScript = `
$code = @'
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class Webcam {
    [DllImport("user32.dll")]
    public static extern int SendMessage(IntPtr hWnd, uint Msg, int wParam, int lParam);
    [DllImport("avicap32.dll")]
    public static extern IntPtr capCreateCaptureWindowA(string lpszWindowName, int dwStyle, int x, int y, int nWidth, int nHeight, int hWnd, int nID);
    [DllImport("user32.dll")]
    public static extern bool DestroyWindow(IntPtr hWnd);

    public const int WM_CAP_CONNECT = 1034;
    public const int WM_CAP_DISCONNECT = 1035;
    public const int WM_CAP_GRAB_FRAME = 1084;
    public const int WM_CAP_SAVEDIB = 1049;

    public static void Snap(string path) {
        IntPtr hWnd = capCreateCaptureWindowA("Webcam", 0, 0, 0, 320, 240, 0, 0);
        SendMessage(hWnd, WM_CAP_CONNECT, 0, 0); 
        SendMessage(hWnd, WM_CAP_GRAB_FRAME, 0, 0);
        SendMessage(hWnd, WM_CAP_SAVEDIB, 0, (int)Marshal.StringToHGlobalAnsi(path));
        SendMessage(hWnd, WM_CAP_DISCONNECT, 0, 0);
        DestroyWindow(hWnd);
    }
}
'@

Add-Type -TypeDefinition $code
[Webcam]::Snap("${savePath}.jpg")
`;
                const scriptPath = path.join(os.tmpdir(), 'capture.ps1');
                fs.writeFileSync(scriptPath, psScript);

                return new Promise((resolve, reject) => {
                    exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (err, stdout, stderr) => {
                        fs.unlinkSync(scriptPath);
                        if (err) {
                            reject(new Error(stderr || err.message));
                        } else {
                            // Verify file exists because avicap failure might not output stderr
                            if (fs.existsSync(`${savePath}.jpg`)) {
                                console.log(`Photo saved to ${savePath}.jpg`);
                                resolve();
                            } else {
                                reject(new Error('Start returned success but file not created. Camera might be busy or missing.'));
                            }
                        }
                    });
                });
            };

            const captureWithFfmpeg = async (savePath) => {
                let cmd = '';
                if (platform === 'darwin') {
                    cmd = `ffmpeg -f avfoundation -framerate 30 -video_size 1280x720 -i "default" -frames:v 1 "${savePath}.jpg" -y`;
                } else if (platform === 'linux') {
                    cmd = `ffmpeg -f video4linux2 -i /dev/video0 -frames:v 1 "${savePath}.jpg" -y`;
                } else if (platform === 'win32') {
                    cmd = `ffmpeg -f dshow -i video="Camera" -frames:v 1 "${savePath}.jpg" -y`;
                }

                return new Promise((resolve, reject) => {
                    exec(cmd, (err, stdout, stderr) => {
                        if (err) reject(err);
                        else {
                            console.log(`Photo saved to ${savePath}.jpg`);
                            resolve();
                        }
                    });
                });
            };


            // Main Execution Flow
            try {
                if (platform === 'darwin') {
                    // Try Swift Native First
                    try {
                        console.log('Attempting native capture via Swift (warmup 2.5s)...');
                        await captureMacNative(savePath);
                        return;
                    } catch (e) {
                        console.log('Native Swift capture failed, trying node-webcam/ffmpeg...');
                    }
                } else if (platform === 'win32') {
                    // Try Windows Native First
                    try {
                        console.log('Attempting native capture via PowerShell/avicap32...');
                        await captureWinNative(savePath);
                        return;
                    } catch (e) {
                        console.log('Native Windows capture failed or not supported, trying node-webcam/ffmpeg...');
                    }
                }
                // Linux -> Falls through to node-webcam which tries fswebcam/ffmpeg

                // Fallback / Standard Node-Webcam logic
                // Check deps implicitly by running it or explicit check

                const opts = {
                    width: 1280,
                    height: 720,
                    quality: 100,
                    delay: 1, // 1 second delay
                    saveShots: true,
                    output: "jpeg",
                    device: false,
                    callbackReturn: "location",
                    verbose: false
                };

                const Webcam = NodeWebcam.create(opts);

                console.log('Capturing photo via node-webcam...');

                Webcam.capture(savePath, async (err, data) => {
                    if (err) {
                        console.error(`Error capturing photo with node-webcam: ${err.message}. Attempting FFmpeg fallback...`);
                        try {
                            await captureWithFfmpeg(savePath);
                        } catch (ffmpegErr) {
                            console.error(`Error capturing photo with FFmpeg: ${ffmpegErr.message}.`);
                            console.error(`Tip: Ensure you have a camera tool installed (imagesnap for Mac, fswebcam for Linux, or ffmpeg).`);
                        }
                    } else {
                        console.log(`Photo saved to ${data}`);
                    }
                });

            } catch (e) {
                console.error(`Error: ${e.message}`);
            }
        });

    program.addHelpText('after', `
Examples:
  Take a photo:
    $ zero-ops camera capture

  Take a photo with custom name:
    $ zero-ops camera capture my-pic
    `);
}
