# Dova AI Learning Advertisement Bot

An automated Twitter advertisement bot that promotes Dova - an AI-powered learning application where users can learn anything using artificial intelligence. The bot posts engaging, unique advertisements every 2 hours, acting as a professional digital marketer for the platform.

## Features

- 🤖 **AI-Powered Advertisements**: Uses ChatGPT to create compelling marketing tweets
- 🔄 **Automated Posting**: Posts unique ads every 2 hours
- 🌐 **Website Intelligence**: Scrapes dova.live for current features and content
- 🚫 **Zero Repetition**: Advanced duplicate detection ensures every tweet is unique
- 📊 **Professional Marketing**: Acts as a digital advertiser for AI learning platform
- ⚡ **Free Tier Compatible**: Works with Twitter's free API tier
- 🎯 **Strategic Timing**: Posts at optimal times for maximum engagement

## Prerequisites

- Node.js 16+ installed
- Twitter Developer Account (Free tier)
- OpenAI API Account
- Basic knowledge of environment variables

## Setup Instructions

### 1. Clone and Install

```bash
# Clone or download the project files
# Navigate to the project directory
npm install
```

### 2. Twitter API Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app (or use existing one)
3. Generate API keys and tokens:
   - API Key
   - API Secret Key
   - Access Token
   - Access Token Secret
4. Make sure your app has **Read and Write** permissions

### 3. OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add some credits to your account (minimal usage)

### 4. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your credentials:
   ```bash
   TWITTER_API_KEY=your_actual_api_key
   TWITTER_API_SECRET=your_actual_api_secret
   TWITTER_ACCESS_TOKEN=your_actual_access_token
   TWITTER_ACCESS_SECRET=your_actual_access_token_secret
   OPENAI_API_KEY=your_actual_openai_key
   ```

### 5. Run the Bot

```bash
# Start the bot
npm start

# For development with auto-restart
npm run dev
```

## How It Works

1. **Website Intelligence**: Every 2 hours, the bot scrapes dova.live for:
   - Latest AI learning features
   - Educational content and benefits
   - Platform updates and capabilities
   - Learning-focused keywords and phrases

2. **Advertisement Creation**: Scraped data is sent to ChatGPT with marketing prompts to:
   - Create compelling 280-character advertisements
   - Focus on AI-powered learning benefits
   - Include strong calls-to-action to download/try Dova
   - Use relevant education and AI hashtags
   - Ensure every tweet is completely unique

3. **Smart Posting**: The bot employs advanced duplicate prevention:
   - Similarity analysis of all previous tweets
   - Multiple generation attempts if content is too similar
   - Automatic retry system for maximum uniqueness

4. **Campaign Tracking**: All advertisements are saved to prevent repetition and track campaign performance

## Customization

### Tweet Frequency
Edit the cron schedule in `index.js`:
```javascript
// Every 2 hours (current)
cron.schedule('0 */2 * * *', async () => {

// Every hour
cron.schedule('0 * * * *', async () => {

// Every 4 hours  
cron.schedule('0 */4 * * *', async () => {
```

### Tweet Content
Modify the prompt in the `generateTweetWithChatGPT` method to change:
- Tone and style
- Hashtags used
- Call-to-action phrases
- Content focus areas

### Website Scraping
Update the scraping logic in `scrapeDovaWebsite` method to:
- Target different HTML elements
- Extract additional information
- Handle website changes

## Files Structure

```
dova-tweet-bot/
├── index.js              # Main bot script
├── package.json          # Dependencies and scripts
├── .env.example          # Environment template
├── .env                  # Your actual credentials (create this)
├── tweet_history.json    # Auto-generated tweet history
└── README.md            # This file
```

## Monitoring

The bot provides console logging for:
- Connection status
- Website scraping results  
- Tweet generation process
- Posting success/failure
- Error handling

## Error Handling

The bot handles common issues:
- **Rate Limiting**: Respects Twitter API limits
- **Website Changes**: Falls back to default content if scraping fails
- **API Failures**: Uses fallback tweet templates
- **Duplicate Detection**: Regenerates content if duplicates found

## Costs

- **Twitter API**: Free tier (1,500 tweets/month)
- **OpenAI API**: ~$0.01 per tweet (very minimal)
- **Server**: Can run on any VPS (~$5/month) or locally

## Troubleshooting

### Bot won't start
- Check all environment variables are set correctly
- Verify Twitter API credentials have Read + Write permissions
- Ensure OpenAI API key is valid and has credits

### No tweets posting
- Check Twitter API rate limits
- Verify account permissions
- Look for error messages in console

### Scraping issues
- Website might have changed structure
- Check if site is blocking automated requests
- Bot will use fallback content automatically

## Legal Notes

- Respect Twitter's Terms of Service
- Don't spam or post inappropriate content
- Consider rate limits and API usage guidelines
- This bot is for educational/business purposes

## Support

For issues:
1. Check the console logs for error messages
2. Verify all API credentials are correct
3. Ensure dependencies are properly installed
4. Check Twitter and OpenAI service status

---

**Happy Streaming with Dova! 🚀**