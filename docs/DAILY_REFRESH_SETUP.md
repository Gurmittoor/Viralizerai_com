# Daily Viral Video Refresh Setup

## Automated Daily Fetch

The system is configured to automatically fetch fresh viral videos daily at 5 AM UTC.

### Manual Cron Job Setup

If you need to set up the cron job manually, run this SQL in Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily viral video fetch at 5 AM UTC
SELECT cron.schedule(
  'daily-viral-fetch',
  '0 5 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://czbxbojafjafhlpotmkd.supabase.co/functions/v1/daily-trending-refresh',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### Verify Cron Job is Running

Check recent cron job executions:

```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### View Active Cron Jobs

```sql
SELECT * FROM cron.job;
```

### Manual Refresh

Users can also manually trigger a refresh anytime by clicking the "Fetch Trending Videos" button in the UI.

## Monitoring

### Check Last Fetch Time

```sql
SELECT MAX(captured_at) as last_fetch 
FROM trends;
```

### View Recent Viral Videos Count

```sql
SELECT 
  DATE(captured_at) as fetch_date,
  COUNT(*) as videos_fetched,
  COUNT(DISTINCT platform) as platforms
FROM trends
WHERE captured_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(captured_at)
ORDER BY fetch_date DESC;
```

## Troubleshooting

If videos aren't refreshing:

1. Check cron job status: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`
2. Check edge function logs in Lovable Cloud
3. Manually trigger via UI button to test the fetch-trending-urls function
4. Verify YOUTUBE_API_KEY secret is set in Lovable Cloud secrets

## Frontend Filter

The UI automatically filters to show only videos from the last 2 days to keep the feed fresh.
