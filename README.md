# Crowdstrike — Falcon Foundry Apps

<p align="center">
  <strong>Community-built apps for the CrowdStrike Falcon Foundry platform</strong>
</p>

<p align="center">
  <a href="https://www.crowdstrike.com/platform/falcon-foundry/"><img src="https://img.shields.io/badge/Falcon-Foundry-ff0000" alt="Falcon Foundry"></a>
  <img src="https://img.shields.io/badge/apps-3-blue" alt="3 Apps">
  <img src="https://img.shields.io/badge/distribution-bundles%20only-lightgrey" alt="Bundles only">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

---

## 📦 What's inside

Public repository shipping **packaged bundles only** (`.tar.gz` / `.zip`) of [Falcon Foundry](https://www.crowdstrike.com/platform/falcon-foundry/) applications, ready to import into any CrowdStrike Falcon tenant. No source code lives here — just signed exports from the Foundry App Manager.

## 🚀 Apps

<table>
  <tr>
    <td align="center" width="33%" valign="top">
      <a href="NVA/"><img src="NVA/docs/radar-logo.png" alt="NVA" width="110"></a>
      <br><br>
      <strong><a href="NVA/">NVA Dashboard</a></strong>
      <br>
      <sub>Network Vulnerability<br>Assesment Dashboard</sub>
      <br><br>
      <sub>FEM · NVA · Spotlight<br>Discover · Alerts v2 · NG-SIEM</sub>
      <br><br>
      <sub>Unified monthly view of exposure<br>and vulnerability data</sub>
    </td>
    <td align="center" width="33%" valign="top">
      <a href="unified-vulnerability-explorer/"><img src="unified-vulnerability-explorer/docs/vuln-logo.png" alt="Unified Vulnerability Explorer" width="110"></a>
      <br><br>
      <strong><a href="unified-vulnerability-explorer/">Unified Vulnerability Explorer</a></strong>
      <br>
      <sub>ALL datalake vs. Network<br>Scanner-only, same views</sub>
      <br><br>
      <sub>Dashboard · Scans · Network Map<br>Timeline · Discovered Vulns</sub>
      <br><br>
      <sub>Flip scope on the fly and<br>validate NVA coverage</sub>
    </td>
    <td align="center" width="33%" valign="top">
      <a href="soc-dashboard/"><img src="soc-dashboard/docs/logo.png" alt="Agentic SOC Oversight Dashboard" width="110"></a>
      <br><br>
      <strong><a href="soc-dashboard/">Agentic SOC Oversight</a></strong>
      <br>
      <sub>Real-time videowall<br>for SOC teams</sub>
      <br><br>
      <sub>15 widgets · MITRE ATT&amp;CK<br>Charlotte AI · Backlog · Feed silence</sub>
      <br><br>
      <sub>Auto-refreshes every ~1 min,<br>built for the ops floor</sub>
    </td>
  </tr>
</table>

## 🧭 Install (common flow)

1. Open **Falcon → Foundry → App Manager → Import app**.
2. Pick the latest bundle from the app's `dist/` folder.
3. Walk the credential wizard for each API integration (one per data source).
4. Deploy and release — the app shows up in **Falcon → Custom apps**.

Per-app scope requirements and quirks live in each app's own README.

## 🛡️ Policies

Each app ships its own license and security policy:

| App | License | Security |
| --- | --- | --- |
| [NVA](NVA/) | [LICENSE](NVA/LICENSE) | [SECURITY.md](NVA/SECURITY.md) |
| [Unified Vulnerability Explorer](unified-vulnerability-explorer/) | [LICENSE](unified-vulnerability-explorer/LICENSE) | [SECURITY.md](unified-vulnerability-explorer/SECURITY.md) |
| [Agentic SOC Oversight Dashboard](soc-dashboard/) | [LICENSE](soc-dashboard/LICENSE) | [SECURITY.md](soc-dashboard/SECURITY.md) |

## ⚠️ Disclaimer

These are community / field-engineering projects. They are **not** officially supported by CrowdStrike. Validate every number against the native Falcon console before taking action, and do not open CrowdStrike Support cases for issues related to these apps.

CrowdStrike®, Falcon® and related product names are registered trademarks of CrowdStrike, Inc. This project is independent and is not officially endorsed by CrowdStrike.

## 👤 Author

**Roberto Clavero**

---

<p align="center"><sub>Built with ❤️ for the Falcon Foundry community.</sub></p>
