using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace CommandCam {
    class Program {
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

        static void Main(string[] args) {
            string filename = "photo.jpg";
            int delay = 1000; // Default 1 second for camera hardware to adjust light

            for (int i = 0; i < args.Length; i++) {
                if (args[i] == "/filename" && i + 1 < args.Length) {
                    filename = args[i + 1];
                }
                if (args[i] == "/delay" && i + 1 < args.Length) {
                    int.TryParse(args[i + 1], out delay);
                }
            }

            Console.WriteLine("Connecting to Windows capture device...");
            IntPtr hWnd = capCreateCaptureWindowA("zero-ops-webcam", 0, 0, 0, 1280, 720, 0, 0);
            
            if (hWnd == IntPtr.Zero) {
                Console.WriteLine("Error: Unable to initialize capture device.");
                Environment.Exit(1);
            }

            int connected = SendMessage(hWnd, WM_CAP_CONNECT, 0, 0);
            if (connected == 0) {
                Console.WriteLine("Error: Connection to camera hardware failed or denied by permissions.");
                DestroyWindow(hWnd);
                Environment.Exit(1);
            }

            Thread.Sleep(delay); // Wait for camera exposure to adjust
            
            SendMessage(hWnd, WM_CAP_GRAB_FRAME, 0, 0);
            SendMessage(hWnd, WM_CAP_SAVEDIB, 0, (int)Marshal.StringToHGlobalAnsi(filename));
            SendMessage(hWnd, WM_CAP_DISCONNECT, 0, 0);
            DestroyWindow(hWnd);
            
            Console.WriteLine("Capture saved successfully.");
        }
    }
}
