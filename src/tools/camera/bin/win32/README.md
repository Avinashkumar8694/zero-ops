# Windows Native Camera Binary

To absolutely guarantee zero supply-chain malware vulnerabilities, `zero-ops` does not download opaque pre-compiled executable binaries from the internet.

Instead, we provide the raw, 100% auditable source code in `CommandCam.cs`. It uses the native Windows `avicap32.dll` library.

### How to Compile (No external tools required)
Every Windows machine comes with a built-in C# compiler. If you want the trusted binary to execute, simply open a Command Prompt and run the native compiler on our source code:

```cmd
C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe /out:CommandCam.exe CommandCam.cs
```

Executing that command will securely compile `CommandCam.exe` on your local machine. From then on, the `zero-ops camera capture` tool will natively detect and use this trusted, locally-compiled app instead of FFmpeg.
