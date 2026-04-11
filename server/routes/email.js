const nodemailer = require("nodemailer");
const path = require("path");
const topMsmes = require("../data/msmeData");
const generateWeeklyReport = require("../templates/weeklyMsmeReport");

/**
 * Sends the weekly MSME credit report email via Gmail SMTP.
 * Called automatically when the server starts.
 */
async function sendWeeklyReport() {
    const htmlContent = generateWeeklyReport(topMsmes);

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        const info = await transporter.sendMail({
            from: `"Optilend Reports" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            subject:
                "🏆 Optilend Weekly Report — Top MSMEs Recommended for Credit Lending",
            html: htmlContent,
        });

        console.log("\n" + "=".repeat(65));
        console.log("  📧  WEEKLY MSME REPORT SENT SUCCESSFULLY!");
        console.log("=".repeat(65));
        console.log(`  Message ID : ${info.messageId}`);
        console.log(`  From       : ${process.env.GMAIL_USER}`);
        console.log(`  To         : ${process.env.GMAIL_USER}`);
        console.log(`  Subject    : Top MSMEs Recommended for Credit Lending`);
        console.log("");
        console.log("  ✅ Check your Gmail inbox!");
        console.log("=".repeat(65) + "\n");
    } catch (error) {
        console.error("\n❌ Failed to send email:", error.message);
    }
}

module.exports = sendWeeklyReport;
