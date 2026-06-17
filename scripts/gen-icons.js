// Run with: node_modules/.bin/electron scripts/gen-icons.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const SIZES = [16, 32, 48, 64, 128, 256, 512];
const CWD = process.cwd();

const PATH_DATA =
  "M31.6,5.2C31.4,5,31,5,30.7,5C21.1,7.6,10.9,7.6,1.3,5C1,5,0.6,5,0.4,5.2" +
  "C0.1,5.4,0,5.7,0,6v20c0,0.3,0.1,0.6,0.4,0.8S1,27,1.3,27c9.6-2.6,19.8-2.6," +
  "29.5,0c0.1,0,0.2,0,0.3,0c0.2,0,0.4-0.1,0.6-0.2c0.2-0.2,0.4-0.5,0.4-0.8V6" +
  "C32,5.7,31.9,5.4,31.6,5.2z M20.1,17.7l-5,3c-0.3,0.2-0.7,0.3-1,0.3" +
  "c-0.3,0-0.7-0.1-1-0.3c-0.6-0.4-1-1-1-1.7V13c0-0.7,0.4-1.3,1-1.7" +
  "c0.6-0.4,1.4-0.3,2,0l5,3c0.6,0.4,0.9,1,0.9,1.7S20.6,17.3,20.1,17.7z";

function buildHtml(size) {
  const pad = Math.round(size * 0.12);
  const iconSize = size - pad * 2;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0}
html,body{width:${size}px;height:${size}px;background:#14151a;
  display:flex;align-items:center;justify-content:center;overflow:hidden}
svg{width:${iconSize}px;height:${iconSize}px;display:block}
</style></head><body>
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path fill="#6f9a8d" d="${PATH_DATA}"/>
</svg>
</body></html>`;
}

async function captureSize(size) {
  const tmpPath = path.join(CWD, `.tmp-icon-${size}.html`);
  fs.writeFileSync(tmpPath, buildHtml(size));

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: size,
      height: size,
      show: false,
      frame: false,
      resizable: false,
      webPreferences: { contextIsolation: true },
    });

    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        win
          .capturePage()
          .then((img) => {
            try { fs.unlinkSync(tmpPath); } catch {}
            const resized = img.resize({ width: size, height: size });
            resolve(resized.toPNG());
            win.destroy();
          })
          .catch((e) => {
            reject(e);
            win.destroy();
          });
      }, 250);
    });

    win.loadFile(tmpPath);
  });
}

app.whenReady().then(async () => {
  fs.mkdirSync(path.join(CWD, "public", "sized"), { recursive: true });

  for (const size of SIZES) {
    try {
      const data = await captureSize(size);
      const dest =
        size === 512
          ? path.join(CWD, "public", "icon.png")
          : path.join(CWD, "public", "sized", `${size}x${size}.png`);
      fs.writeFileSync(dest, data);
      console.log(`✓ ${path.relative(CWD, dest)}  (${data.length} bytes)`);
    } catch (e) {
      console.error(`✗ size ${size}: ${e.message}`);
    }
  }

  app.quit();
});

app.on("window-all-closed", () => {});
