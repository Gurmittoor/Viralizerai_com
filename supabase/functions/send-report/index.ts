import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailReport {
  type: "daily_summary" | "error_alert";
  cycle_date: string;
  videos_fetched?: number;
  scripts_generated?: number;
  variants_created?: number;
  posts_scheduled?: number;
  top_performers?: any[];
  errors?: string[];
  next_cycle_time?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const report: EmailReport = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }
    
    const recipientEmail = "gurmit@dealsonfasttrack.com";
    
    let subject = "";
    let html = "";

    if (report.type === "daily_summary") {
      subject = `🎬 Daily Viral Ad Report - ${report.cycle_date}`;
      html = generateDailySummaryEmail(report);
    } else if (report.type === "error_alert") {
      subject = `⚠️ Viral Ad Factory Alert - ${report.cycle_date}`;
      html = generateErrorAlertEmail(report);
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "AI Agents 247 Factory <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: subject,
        html: html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, email_id: emailData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function generateDailySummaryEmail(report: EmailReport): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .metric { display: flex; justify-content: space-between; padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; }
          .metric-label { font-weight: 600; color: #333; }
          .metric-value { font-weight: bold; color: #667eea; font-size: 18px; }
          .performer { background: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .next-cycle { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #2196f3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 Daily Viral Ad Production Report</h1>
            <p>${report.cycle_date}</p>
          </div>
          <div class="content">
            <h2>📊 Production Metrics</h2>
            <div class="metric">
              <span class="metric-label">Viral Videos Analyzed</span>
              <span class="metric-value">${report.videos_fetched || 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Scripts Generated</span>
              <span class="metric-value">${report.scripts_generated || 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Tone Variants Created</span>
              <span class="metric-value">${report.variants_created || 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Posts Scheduled</span>
              <span class="metric-value">${report.posts_scheduled || 0}</span>
            </div>

            ${report.top_performers && report.top_performers.length > 0 ? `
              <h2>🏆 Top Performers</h2>
              ${report.top_performers.map(performer => `
                <div class="performer">
                  <strong>${performer.tone} Variant</strong><br>
                  CTR: ${performer.ctr}% | Watch Time: ${performer.watch_time}s<br>
                  <small>Platforms: ${performer.platforms}</small>
                </div>
              `).join('')}
            ` : ''}

            ${report.next_cycle_time ? `
              <div class="next-cycle">
                <strong>⏰ Next Cycle:</strong> ${report.next_cycle_time}
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>AI Agents 247 Viral Ad Factory • Powered by Lovable</p>
            <p>Running autonomously at aiagents247.ca</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateErrorAlertEmail(report: EmailReport): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .error { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Production Error Alert</h1>
            <p>${report.cycle_date}</p>
          </div>
          <div class="content">
            <h2>🚨 Errors Detected</h2>
            ${report.errors?.map(error => `
              <div class="error">
                <strong>Error:</strong> ${error}
              </div>
            `).join('') || '<p>No specific error details available.</p>'}
            
            <p><strong>Action Required:</strong> Please check the system logs and resolve any issues to resume autonomous operation.</p>
          </div>
          <div class="footer">
            <p>AI Agents 247 Viral Ad Factory • Powered by Lovable</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
