/**
 * Generates a vibrant, colorful HTML email template for the
 * "Top MSMEs of the Week" credit lending report.
 */
function generateWeeklyReport(msmes) {
    const currentDate = new Date();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - 7);

    const formatDate = (d) =>
        d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    const avgScore = Math.round(
        msmes.reduce((sum, m) => sum + m.optilendScore, 0) / msmes.length
    );

    // Color helpers based on score
    const getScoreColor = (score) => {
        if (score >= 85) return "#16a34a"; // green-600
        if (score >= 80) return "#22c55e"; // green-500
        if (score >= 75) return "#f59e0b"; // amber-500
        return "#ef4444"; // red-500
    };

    const getScoreBg = (score) => {
        if (score >= 85) return "#dcfce7"; // green-100
        if (score >= 80) return "#f0fdf4"; // green-50
        if (score >= 75) return "#fef3c7"; // amber-100
        return "#fee2e2"; // red-100
    };

    const getScoreLabel = (score) => {
        if (score >= 85) return "Excellent";
        if (score >= 80) return "Very Good";
        if (score >= 75) return "Good";
        return "Average";
    };

    const getRankBadge = (rank) => {
        const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
        return medals[rank] || `#${rank}`;
    };

    const msmeRows = msmes
        .map(
            (msme) => `
      <tr>
        <td style="padding: 16px 12px; text-align: center; font-size: 22px; border-bottom: 1px solid #f1f5f9;">
          ${getRankBadge(msme.rank)}
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9;">
          <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px;">${msme.name}</div>
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9;">
          <div style="display: inline-block; background: #f0f9ff; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            ${msme.industry}
          </div>
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9;">
          <div style="color: #64748b; font-size: 13px;">📍 ${msme.location}</div>
        </td>
        <td style="padding: 16px 12px; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <div style="display: inline-block; background: ${getScoreBg(msme.optilendScore)}; color: ${getScoreColor(msme.optilendScore)}; padding: 6px 14px; border-radius: 24px; font-weight: 800; font-size: 16px; min-width: 50px;">
            ${msme.optilendScore}
          </div>
          <div style="font-size: 10px; color: ${getScoreColor(msme.optilendScore)}; font-weight: 600; margin-top: 3px;">${getScoreLabel(msme.optilendScore)}</div>
        </td>
      </tr>
    `
        )
        .join("");

    // Mobile-friendly card layout for each MSME
    const msmeCards = msmes
        .map(
            (msme) => `
      <div style="background: #ffffff; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-left: 5px solid ${getScoreColor(msme.optilendScore)};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span style="font-size: 22px; margin-right: 8px;">${getRankBadge(msme.rank)}</span>
            <span style="font-weight: 800; font-size: 17px; color: #1e293b;">${msme.name}</span>
          </div>
          <div style="background: ${getScoreBg(msme.optilendScore)}; color: ${getScoreColor(msme.optilendScore)}; padding: 8px 16px; border-radius: 24px; font-weight: 800; font-size: 18px; text-align: center; min-width: 60px;">
            ${msme.optilendScore}
            <div style="font-size: 9px; font-weight: 600; letter-spacing: 0.5px;">${getScoreLabel(msme.optilendScore)}</div>
          </div>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div style="background: #f0f9ff; color: #0369a1; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            🏭 ${msme.industry}
          </div>
          <div style="background: #fef7ed; color: #c2410c; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            📍 ${msme.location}
          </div>
        </div>
      </div>
    `
        )
        .join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Optilend - Top MSMEs of the Week</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Outer Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width: 680px; width: 100%;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 30%, #10b981 70%, #22c55e 100%); border-radius: 20px 20px 0 0; padding: 40px 36px; text-align: center;">
              <div style="margin-bottom: 8px;">
                <span style="font-size: 36px;">🏦</span>
              </div>
              <h1 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                Optilend Weekly Report
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 500;">
                Top MSMEs Recommended for Credit Lending
              </p>
              <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 24px; padding: 6px 18px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 600;">
                  📅 ${formatDate(weekStart)} — ${formatDate(currentDate)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Summary Stats -->
          <tr>
            <td style="background: #ffffff; padding: 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- MSMEs Evaluated -->
                  <td width="33%" style="text-align: center; padding: 12px;">
                    <div style="background: linear-gradient(135deg, #dcfce7, #f0fdf4); border-radius: 16px; padding: 20px 12px;">
                      <div style="font-size: 32px; font-weight: 900; color: #16a34a;">${msmes.length}</div>
                      <div style="font-size: 11px; color: #4ade80; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">MSMEs Evaluated</div>
                    </div>
                  </td>
                  <!-- Avg Optilend Score -->
                  <td width="34%" style="text-align: center; padding: 12px;">
                    <div style="background: linear-gradient(135deg, #dbeafe, #eff6ff); border-radius: 16px; padding: 20px 12px;">
                      <div style="font-size: 32px; font-weight: 900; color: #2563eb;">${avgScore}</div>
                      <div style="font-size: 11px; color: #60a5fa; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">Avg Optilend Score</div>
                    </div>
                  </td>
                  <!-- Top Score -->
                  <td width="33%" style="text-align: center; padding: 12px;">
                    <div style="background: linear-gradient(135deg, #fef3c7, #fffbeb); border-radius: 16px; padding: 20px 12px;">
                      <div style="font-size: 32px; font-weight: 900; color: #d97706;">${msmes[0].optilendScore}</div>
                      <div style="font-size: 11px; color: #f59e0b; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">Highest Score</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background: #ffffff; padding: 0 36px;">
              <div style="height: 2px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent);"></div>
            </td>
          </tr>

          <!-- Section Title -->
          <tr>
            <td style="background: #ffffff; padding: 28px 36px 16px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #1e293b;">
                🏆 This Week's Top MSMEs
              </h2>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
                Ranked by Optilend Score — higher scores indicate stronger creditworthiness
              </p>
            </td>
          </tr>

          <!-- MSME Cards -->
          <tr>
            <td style="background: #ffffff; padding: 0 24px 24px;">
              ${msmeCards}
            </td>
          </tr>

          <!-- Score Legend -->
          <tr>
            <td style="background: #ffffff; padding: 12px 36px 28px;">
              <div style="background: #f8fafc; border-radius: 12px; padding: 16px 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Optilend Score Guide</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 3px 0;">
                      <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #16a34a; margin-right: 8px; vertical-align: middle;"></span>
                      <span style="font-size: 12px; color: #334155; vertical-align: middle;"><strong>85–100</strong> Excellent — Highly recommended for lending</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">
                      <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; margin-right: 8px; vertical-align: middle;"></span>
                      <span style="font-size: 12px; color: #334155; vertical-align: middle;"><strong>80–84</strong> Very Good — Strong credit profile</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">
                      <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #f59e0b; margin-right: 8px; vertical-align: middle;"></span>
                      <span style="font-size: 12px; color: #334155; vertical-align: middle;"><strong>75–79</strong> Good — Moderate risk, viable candidate</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">
                      <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; margin-right: 8px; vertical-align: middle;"></span>
                      <span style="font-size: 12px; color: #334155; vertical-align: middle;"><strong>Below 75</strong> Average — Requires further review</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="background: #ffffff; padding: 8px 36px 32px; text-align: center;">
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #10b981); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 30px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(16,185,129,0.3);">
                View Full Report on Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; border-radius: 0 0 20px 20px; padding: 28px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="margin-bottom: 12px;">
                <span style="font-size: 18px; font-weight: 800; color: #0ea5e9;">Opti</span><span style="font-size: 18px; font-weight: 800; color: #10b981;">lend</span>
              </div>
              <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8;">
                AI-Powered Credit Assessment for Indian MSMEs
              </p>
              <p style="margin: 0 0 12px; font-size: 11px; color: #cbd5e1;">
                This is an automated weekly report. Do not reply to this email.
              </p>
              <div style="margin-top: 8px;">
                <span style="font-size: 10px; color: #cbd5e1;">© ${currentDate.getFullYear()} Optilend Technologies Pvt. Ltd. All rights reserved.</span>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

module.exports = generateWeeklyReport;
