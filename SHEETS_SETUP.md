# Google Sheets Integration Setup

## Quick Setup (5 minutes)

### Step 1: Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a **New Project** (or select existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **Service Account**
5. Fill in the details:
   - Service Account Name: `cambridge-city-fc`
   - Click **Create and Continue**
6. Skip optional steps, click **Done**

### Step 2: Create & Download Service Account Key

1. In the **Service Accounts** list, click the account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Click **Create** — JSON key will download automatically
6. **Copy the entire JSON content** — you'll need this in Step 4

### Step 3: Share the Google Sheet with Service Account

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1HNU4KIb_84KTASKqwV32Jeo3Wcr4jJyV2px5hM9eC9s/edit
2. Click **Share** button
3. Copy the `client_email` from the JSON key you downloaded (looks like: `cambridge-city-fc@PROJECT-ID.iam.gserviceaccount.com`)
4. Paste the email in the Share dialog
5. Give it **Editor** access
6. Click **Share**

### Step 4: Add Credentials to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select the **cambridge-city-fc** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Name: `GOOGLE_SHEETS_CREDENTIALS`
6. Value: **Paste the entire JSON key** from Step 2
7. Click **Save**
8. **Redeploy** the project (go to **Deployments**, click the latest one, click **Redeploy**)

### Step 5: Test It

1. Open the app: https://cambridge-city-fc.vercel.app/
2. Run a test match
3. At the end, click **Save** button
4. Check the Google Sheet — data should appear in:
   - **Match Events** tab
   - **Season Stats** tab
   - **Match History** tab

---

## Local Development (Optional)

If you want to test locally:

1. Paste the JSON key content into `.env.local`:
   ```
   GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"..."}
   ```

2. Run: `npm run dev`

3. Test locally at `http://localhost:5173`

---

## Troubleshooting

**"Credentials not configured"**
- Check that `GOOGLE_SHEETS_CREDENTIALS` is set in Vercel
- Redeploy after adding the environment variable

**"Permission denied"**
- Make sure the service account email is shared on the Google Sheet with **Editor** access

**"Invalid Credentials"**
- Verify the JSON is pasted correctly (no missing quotes or brackets)

---

## What Gets Saved

After each match, the app saves:

**Match Events Tab:**
- Date, Opponent, Time, Event Type, Player Name, Squad Number

**Season Stats Tab:**
- Date, Opponent, Player Name, Squad Number, Goals, Assists, Yellow Cards, Red Cards, Minutes Played, MOTM Votes

**Match History Tab:**
- Date, Opponent, Location, Goals, Yellow Cards, Red Cards, Total Minutes, Formation

All data is automatically appended (no data is overwritten).
