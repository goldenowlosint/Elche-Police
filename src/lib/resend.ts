import { Resend } from "resend";
import dotenv from "dotenv";
import { marked } from "marked";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY!);

// Default email styling template
const getEmailTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Golden Owl - Email Template</title>
    <style>
      :root {
        --primary-color: #0a0a0a;
        --secondary-color: #f4f4f4;
        --background-color: #f4f4f4;
        --text-color: #333333;
        --link-color: #0056b3;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: var(--text-color);
        background-color: var(--background-color);
      }
      .email-container {
        margin: 0 auto;
        background-color: #ffffff;
      }
      .email-header {
        background-color: var(--primary-color);
        background-image: url('https://res.cloudinary.com/dbfeaezim/image/upload/v1731536244/quentin852_supplychain_themed_background_for_a_dashboard_report_4271d514-e288-43f3-8045-3987e5a6443b-_1_1_zcpibo.png');
        background-size: cover;
        background-position: center;
        background-blend-mode: overlay;
        padding: 20px;
        text-align: center;
        position: relative;
      }
      .email-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
 
        z-index: 0;
      }
      .email-header img,
      .email-header h1 {
        opacity: 1;
        position: relative;
        z-index: 1;
      }
      .email-header img {
        width: 60px;
        height: 50px;
        object-fit: cover;
      }
      .email-header h1 {
        margin: 10px 0 0;
        color: var(--secondary-color);
        font-size: 20px;
      }
      .email-content {
        padding: 30px;
        background-color: #ffffff;
        border-radius: 0 0 8px 8px;
      }
      .email-content h1 {
        font-size: 20px;
      }
      a {
        color: var(--link-color);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      pre, code {
        background-color: #f8f9fa;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 14px;
      }
      blockquote {
        border-left: 4px solid var(--primary-color);
        margin: 0;
        padding-left: 16px;
        color: #6c757d;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #6c757d;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <img src="https://res.cloudinary.com/dbfeaezim/image/upload/v1731534617/GO-08_w47juw.png" alt="Golden Owl Logo">
        <h1>Golden Owl Media Report Monitoring</h1>
      </div>
      <div class="email-content">
             ${content}
      </div>
      <div class="footer">
        &copy; 2023 Golden Owl. All rights reserved.
      </div>
    </div>
  </body>
</html>
`;

export const sendEmail = async (emailData: {
  from: string;
  to: string;
  subject: string;
  markdown: string;
}): Promise<void> => {
  try {
    const htmlContent = await marked(emailData.markdown);
    const styledHtml = getEmailTemplate(htmlContent);

    await resend.emails.send({
      ...emailData,
      html: styledHtml,
    });

    console.log(`Email successfully sent to ${emailData.to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};
