# Arkham Stock: easiest free GitHub + Render path

This folder contains the complete Arkham Stock v0.4 project. It has been adapted to deploy on Render's **free Node web service** (no paid persistent disk).

## One manual step on GitHub

1. Unzip `arkham-stock-github-upload.zip` on your computer.
2. Open https://github.com/JesterJayJoker/arkham-stock
3. Select **Add file > Upload files** (if empty, use the **uploading an existing file** link).
4. Drag the **contents of the unzipped folder** into GitHub. Preserve the folders `backend`, `data`, `public`, `tests`, and `.github`. Do not upload the ZIP itself.
5. Click **Commit changes**.

Tell ChatGPT "uploaded". It can then create the Render web service using the connected Render integration and test the hosted deployment.

## Important free-hosting limitations

Render Free web services sleep after inactivity, and the first request may take about a minute. The local retailer cache is shared while the server runs, but it is **not durable** across restarts or deployments on the free plan. The app should still work; it just has to recheck retailer availability after a restart. No real-time inventory is guaranteed until checks have been validated on the hosted server.

Do not upgrade Replit or Render solely to get this first version running.
