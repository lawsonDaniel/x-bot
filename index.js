const puppeteer = require('puppeteer');
const { TwitterApi } = require('twitter-api-v2');
const OpenAI = require('openai');
const cron = require('node-cron');
const fs = require('fs').promises;
require('dotenv').config();

class DovaTweetBot {
  constructor() {
    // Initialize Twitter client
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.dovaUrl = 'https://www.dova.live/';
    this.lastScrapedData = null;
    this.tweetHistory = [];
    this.tweetCounter = 0; // Track tweet count for promo timing
    
    // Tweet type distribution (1 in 6 tweets is promotional)
    this.tweetTypes = [
      'engagement_hook',
      'value_post', 
      'motivational_quote',
      'thread_teaser',
      'engagement_hook',
      'promotional' // Only 1 in 6 tweets
    ];
    
    // Creative CTAs pool for promotional posts
    this.creativeCTAs = [
      "🚀 Start your AI learning journey → dova.live",
      "💡 Join thousands learning smarter → dova.live",
      "🎯 Transform your skills today → dova.live", 
      "⚡ Begin your AI education now → dova.live",
      "🌟 Unlock your potential at → dova.live",
      "🔥 Experience the future → dova.live",
      "🎓 Level up your learning → dova.live",
      "💪 Start mastering skills → dova.live",
      "🧠 Discover AI-powered learning → dova.live",
      "✨ Your AI tutor awaits → dova.live"
    ];

    // Content pools for different tweet types
    this.contentPools = {
      engagement_hooks: [
        "What's the biggest learning mistake you see people make?",
        "Hot take: Traditional education is preparing students for jobs that won't exist in 10 years. Agree or disagree? 🤔",
        "Poll: What's your biggest learning challenge? A) Time B) Motivation C) Finding good resources D) Staying consistent",
        "Question for the room: If you could master ONE skill in 30 days, what would it be?",
        "Controversial opinion: Most online courses are just expensive entertainment. Change my mind 👇",
        "What skill do you wish you had learned 5 years ago?",
        "Fill in the blank: Learning would be 10x easier if _______",
        "Real talk: What stops you from learning something new? Let's solve this together 🧵",
        "Quick question: Do you learn better alone or with others? Why?",
        "Unpopular opinion: Failing fast is better than studying slow. Thoughts?"
      ],
      
      value_posts: [
        "3 signs you're learning efficiently:\n• You can explain it simply\n• You remember without notes\n• You see connections to other topics",
        "The 20-minute rule: Study anything for 20 minutes daily. In 6 months, you'll be in the top 10% of learners in that field.",
        "Learning hack: Teach what you just learned to someone else (even if it's just explaining to your mirror). Retention jumps 90%.",
        "Stop highlighting everything. Start asking 'How does this connect to what I already know?' Better learning in half the time.",
        "The Feynman Technique in 4 steps:\n1. Pick a concept\n2. Explain it in simple terms\n3. Find gaps in your explanation\n4. Simplify further",
        "Learning tip: Change your environment every 25 minutes. Your brain treats new locations as 'important' and remembers better.",
        "Study smarter: Instead of re-reading notes, try to recall key points from memory first. Struggle = stronger neural pathways.",
        "The 5-minute rule: Can't start studying? Commit to just 5 minutes. You'll usually continue, and if not, you still built the habit.",
        "Active learning beats passive reading 10:1. Always ask: 'What would I do with this information in the real world?'",
        "Learning plateau breakthrough: Change ONE variable. Different time, place, method, or teacher. Your brain loves novelty."
      ],
      
      motivational_quotes: [
        "\"The expert in anything was once a beginner who refused to give up.\" Your future self is counting on your consistency today.",
        "\"You don't have to be great to get started, but you have to get started to be great.\" What are you starting today?",
        "\"The best time to plant a tree was 20 years ago. The second best time is now.\" Same goes for learning that skill you've been putting off.",
        "\"In a world of rapid change, the learners inherit the earth.\" Are you inheriting or getting left behind?",
        "\"Your limitation—it's only your imagination.\" Stop telling yourself you're not smart enough. Start proving yourself wrong.",
        "\"Success is the sum of small efforts repeated daily.\" What small learning effort will you repeat today?",
        "\"The only impossible journey is the one you never begin.\" Your learning journey starts with the first step.",
        "\"Don't wait for opportunity. Create it through learning.\" Every new skill is a door to new possibilities.",
        "\"You are never too old to set another goal or to dream a new dream.\" Learning has no expiration date.",
        "\"Knowledge isn't power until it's applied.\" What will you do with what you learn today?"
      ],
      
      thread_teasers: [
        "Most people learn backwards (and wonder why they struggle). Here's the right way 🧵👇",
        "I spent $10K on courses before learning this simple truth about skill acquisition. Thread 🧵",
        "Why 90% of learners quit in the first month (and how the 10% push through) 🧵👇",
        "The counterintuitive learning method that doubled my skill acquisition speed 🧵",
        "5 learning myths that are sabotaging your progress. Number 3 will shock you 🧵👇",
        "How I went from struggling student to rapid learner in 30 days. The method nobody talks about 🧵",
        "The psychology trick that makes hard subjects feel easy. Most educators don't know this 🧵👇",
        "Why smart people often learn slower (and how to fix it) 🧵",
        "The 15-minute daily habit that transformed my learning ability forever 🧵👇",
        "3 simple questions that will 10x your learning speed. Most people never ask them 🧵"
      ]
    };
  }

  getTweetType() {
    // Cycle through tweet types to ensure variety
    const currentType = this.tweetTypes[this.tweetCounter % this.tweetTypes.length];
    this.tweetCounter++;
    return currentType;
  }

  getRandomCTA() {
    const recentCTAs = this.tweetHistory.slice(-5).map(tweet => {
      const ctaMatch = tweet.match(/→ dova\.live|dova\.live/i);
      return ctaMatch ? ctaMatch[0] : null;
    }).filter(Boolean);
    
    const availableCTAs = this.creativeCTAs.filter(cta => 
      !recentCTAs.some(recent => cta.includes(recent.replace('→ ', '').replace('dova.live', '')))
    );
    
    const ctaPool = availableCTAs.length > 0 ? availableCTAs : this.creativeCTAs;
    return ctaPool[Math.floor(Math.random() * ctaPool.length)];
  }

  async scrapeDovaWebsite() {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      console.log('Scraping Dova website...');
      await page.goto(this.dovaUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const dovaInfo = await page.evaluate(() => {
        const data = {
          title: '',
          description: '',
          features: [],
          headings: [],
          benefits: []
        };

        data.title = document.title || 'Dova';

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) data.description = metaDesc.content;

        const headings = document.querySelectorAll('h1, h2, h3');
        headings.forEach(h => {
          if (h.textContent.trim().length > 0 && h.textContent.trim().length < 100) {
            data.headings.push(h.textContent.trim());
          }
        });

        const paragraphs = document.querySelectorAll('p, div, span');
        paragraphs.forEach(p => {
          const text = p.textContent.trim();
          if (text.length > 20 && text.length < 200) {
            if (text.toLowerCase().includes('learn') || 
                text.toLowerCase().includes('ai') || 
                text.toLowerCase().includes('education') ||
                text.toLowerCase().includes('skill') ||
                text.toLowerCase().includes('tutor') ||
                text.toLowerCase().includes('teach') ||
                text.toLowerCase().includes('study') ||
                text.toLowerCase().includes('knowledge') ||
                text.toLowerCase().includes('course') ||
                text.toLowerCase().includes('training')) {
              data.features.push(text);
            }
          }
        });

        return data;
      });

      this.lastScrapedData = dovaInfo;
      console.log('Website scraped successfully:', dovaInfo);
      return dovaInfo;

    } catch (error) {
      console.error('Error scraping website:', error);
      return {
        title: 'Dova - AI-Powered Learning Platform',
        description: 'Learn anything with AI - personalized education for everyone',
        features: ['AI-powered learning', 'Personalized tutoring', 'Adaptive education', 'Smart learning paths', 'Interactive AI lessons'],
        headings: ['Learn Anything with AI', 'Your Personal AI Tutor', 'Revolutionize Your Learning'],
        benefits: ['Learn at your own pace', 'AI adapts to your style', 'Master any skill', '24/7 AI tutor available']
      };
    } finally {
      await browser.close();
    }
  }

  async generateTweetByType(tweetType, dovaInfo) {
    try {
      let prompt = '';
      
      switch (tweetType) {
        case 'engagement_hook':
          prompt = `
            Create an engaging Twitter post that asks a question, starts a discussion, or presents a thought-provoking statement about learning, education, AI, or skill development.
            
            Style options:
            - Ask an engaging question about learning challenges
            - Present a controversial but thoughtful opinion about education
            - Create a poll about learning preferences
            - Share a "fill in the blank" prompt
            
            REQUIREMENTS:
            - Maximum 280 characters
            - Focus on learning, AI, education, or skill development
            - Encourage replies and engagement
            - Use 1-2 relevant emojis
            - NO promotional content or links
            - Be conversational and relatable
            - Different from previous tweets: ${this.tweetHistory.slice(-3).join(' ||| ')}
            
            Examples of style (create something similar but unique):
            - "What's the biggest learning mistake you've made? (Mine was trying to learn everything at once 😅)"
            - "Unpopular opinion: Most people learn too passively. Active learning = 10x results. Agree?"
            - "Fill in the blank: Learning would be easier if _______"
          `;
          break;
          
        case 'value_post':
          prompt = `
            Create a valuable Twitter post that teaches something practical about learning, studying, skill development, or AI in education.
            
            Format options:
            - Share a specific learning technique or hack
            - List 3-5 actionable tips
            - Explain a learning principle
            - Give a step-by-step method
            
            REQUIREMENTS:
            - Maximum 280 characters
            - Provide genuine value and actionable advice
            - Use bullet points or numbers if listing items
            - Focus on learning, studying, or skill development
            - NO promotional content or links
            - Use 1-2 relevant emojis
            - Different from previous tweets: ${this.tweetHistory.slice(-3).join(' ||| ')}
            
            Examples of style (create something similar but unique):
            - "Learning hack: Explain new concepts out loud to yourself. Your brain processes verbal explanations differently than reading."
            - "3 signs you're learning effectively:\n• You can teach it simply\n• You remember without notes\n• You connect it to other ideas"
          `;
          break;
          
        case 'motivational_quote':
          prompt = `
            Create an inspirational Twitter post with a motivational quote or statement about learning, growth, or personal development.
            
            REQUIREMENTS:
            - Maximum 280 characters
            - Include an inspiring quote (can be famous or original)
            - Add a personal reflection or call to action
            - Focus on learning, growth, or skill development
            - NO promotional content or links
            - Use 1-2 inspiring emojis
            - Be genuinely motivational, not cheesy
            - Different from previous tweets: ${this.tweetHistory.slice(-3).join(' ||| ')}
            
            Examples of style (create something similar but unique):
            - "\"The expert in anything was once a beginner.\" Remember this when that new skill feels impossible. Start anyway."
            - "\"Your limitation is only your imagination.\" Stop saying you're not smart enough. Start proving yourself wrong."
          `;
          break;
          
        case 'thread_teaser':
          prompt = `
            Create a Twitter thread teaser that promises valuable content about learning, AI in education, or skill development.
            
            REQUIREMENTS:
            - Maximum 280 characters
            - Create curiosity and anticipation
            - Promise valuable insights in a thread format
            - End with "🧵👇" or similar thread indicator
            - Focus on learning, education, or skill topics
            - NO promotional content or links
            - Use 1-2 relevant emojis
            - Make it clickable and intriguing
            - Different from previous tweets: ${this.tweetHistory.slice(-3).join(' ||| ')}
            
            Examples of style (create something similar but unique):
            - "Most people learn backwards (and wonder why they fail). Here's the right approach 🧵👇"
            - "5 learning myths that sabotage your progress. #3 will surprise you 🧵👇"
            - "The counterintuitive method that doubled my learning speed 🧵"
          `;
          break;
          
        case 'promotional':
          const creativeCTA = this.getRandomCTA();
          prompt = `
            Create an engaging Twitter advertisement for Dova - an AI-powered learning application.
            
            Website information:
            - Title: ${dovaInfo.title}
            - Description: ${dovaInfo.description}
            - Features: ${dovaInfo.features.slice(0, 3).join(', ')}
            
            REQUIREMENTS:
            - Maximum 280 characters INCLUDING the call-to-action
            - MUST end with: "${creativeCTA}"
            - Focus on AI-powered learning benefits
            - Be professional but enthusiastic
            - Include 1-2 relevant hashtags
            - Completely different from previous promotional tweets
            - Make it sound valuable, not pushy
            
            Previous promotional tweets to avoid: ${this.tweetHistory.filter(t => t.includes('dova.live')).slice(-3).join(' ||| ')}
          `;
          break;
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a social media expert creating diverse, engaging Twitter content about learning and education. Each tweet must be unique, valuable, and appropriate for its type. Never repeat previous content.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 120,
        temperature: 0.9,
      });

      let tweet = response.choices[0].message.content.trim();
      tweet = tweet.replace(/^["']|["']$/g, '');
      
      // For promotional tweets, ensure CTA is included
      if (tweetType === 'promotional') {
        const creativeCTA = this.getRandomCTA();
        if (!tweet.includes('dova.live')) {
          tweet = tweet.replace(/→.*$|dova\.live.*$/i, '').trim();
          tweet = `${tweet} ${creativeCTA}`;
        }
      }
      
      // Ensure tweet is within character limit
      if (tweet.length > 280) {
        if (tweetType === 'promotional') {
          const ctaPart = this.getRandomCTA();
          const maxContentLength = 280 - ctaPart.length - 1;
          const contentPart = tweet.replace(ctaPart, '').trim();
          tweet = `${contentPart.substring(0, maxContentLength).trim()} ${ctaPart}`;
        } else {
          tweet = tweet.substring(0, 277) + '...';
        }
      }
      
      return tweet;

    } catch (error) {
      console.error('Error generating tweet:', error);
      
      // Fallback content by type
      const fallbacks = {
        engagement_hook: this.contentPools.engagement_hooks,
        value_post: this.contentPools.value_posts,
        motivational_quote: this.contentPools.motivational_quotes,
        thread_teaser: this.contentPools.thread_teasers,
        promotional: [`🧠 Ready to learn anything with AI? Dova creates personalized learning paths just for you! #AILearning ${this.getRandomCTA()}`]
      };
      
      const pool = fallbacks[tweetType] || fallbacks.value_post;
      const availableTweets = pool.filter(tweet => 
        !this.tweetHistory.some(prev => this.calculateSimilarity(tweet, prev) > 0.3)
      );
      
      return availableTweets.length > 0 
        ? availableTweets[Math.floor(Math.random() * availableTweets.length)]
        : pool[Math.floor(Math.random() * pool.length)];
    }
  }

  calculateSimilarity(str1, str2) {
    const clean1 = str1.replace(/#\w+|@\w+|https?:\/\/\S+|→ dova\.live|dova\.live/gi, '').toLowerCase().trim();
    const clean2 = str2.replace(/#\w+|@\w+|https?:\/\/\S+|→ dova\.live|dova\.live/gi, '').toLowerCase().trim();
    
    const words1 = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  async isDuplicateOrSimilar(newTweet) {
    return this.tweetHistory.some(previousTweet => {
      const similarity = this.calculateSimilarity(newTweet, previousTweet);
      return similarity > 0.4;
    });
  }

  async postTweet(tweetText, tweetType) {
    try {
      if (await this.isDuplicateOrSimilar(tweetText)) {
        console.log('⚠️  Tweet too similar to previous ones, regenerating...');
        return false;
      }
      
      console.log(`Posting ${tweetType} tweet:`, tweetText);
      console.log('Tweet length:', tweetText.length, 'characters');
      
      const tweet = await this.twitterClient.v2.tweet(tweetText);
      
      console.log('✅ Tweet posted successfully:', tweet.data.id);
      
      this.tweetHistory.push(tweetText);
      
      if (this.tweetHistory.length > 20) {
        this.tweetHistory = this.tweetHistory.slice(-20);
      }
      
      await this.saveTweetHistory();
      
      return tweet;

    } catch (error) {
      console.error('❌ Error posting tweet:', error);
      
      if (error.code === 403) {
        console.log('Rate limited or duplicate tweet detected by Twitter. Waiting...');
      }
      
      return false;
    }
  }

  async saveTweetHistory() {
    try {
      const historyData = {
        history: this.tweetHistory,
        tweetCounter: this.tweetCounter,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile('tweet_history.json', JSON.stringify(historyData, null, 2));
    } catch (error) {
      console.error('Error saving tweet history:', error);
    }
  }

  async loadTweetHistory() {
    try {
      const data = await fs.readFile('tweet_history.json', 'utf8');
      const historyData = JSON.parse(data);
      this.tweetHistory = historyData.history || [];
      this.tweetCounter = historyData.tweetCounter || 0;
      console.log('Tweet history loaded:', this.tweetHistory.length, 'tweets');
    } catch (error) {
      console.log('No existing tweet history found, starting fresh');
      this.tweetHistory = [];
      this.tweetCounter = 0;
    }
  }

  async createAndPostTweet() {
    try {
      const tweetType = this.getTweetType();
      console.log(`\n=== Creating ${tweetType.toUpperCase().replace('_', ' ')} tweet ===`);
      console.log('Time:', new Date().toLocaleString());
      console.log('Tweet #:', this.tweetCounter);
      
      // Only scrape for promotional tweets to save resources
      let dovaInfo = null;
      if (tweetType === 'promotional') {
        dovaInfo = await this.scrapeDovaWebsite();
      } else {
        // Use cached data or fallback
        dovaInfo = this.lastScrapedData || {
          title: 'Dova - AI Learning Platform',
          description: 'Personalized AI education',
          features: ['AI tutoring', 'Adaptive learning', 'Skill development']
        };
      }
      
      let attempts = 0;
      let tweetPosted = false;
      const maxAttempts = 3;
      
      while (!tweetPosted && attempts < maxAttempts) {
        attempts++;
        console.log(`📝 Generating ${tweetType} tweet attempt ${attempts}...`);
        
        const tweetText = await this.generateTweetByType(tweetType, dovaInfo);
        const result = await this.postTweet(tweetText, tweetType);
        
        if (result) {
          tweetPosted = true;
          console.log(`🎉 ${tweetType.toUpperCase().replace('_', ' ')} tweet posted successfully!`);
        } else {
          console.log(`🔄 Attempt ${attempts} failed, trying again...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!tweetPosted) {
        console.log('⚠️  Failed to generate unique tweet after', maxAttempts, 'attempts');
      }
      
      console.log('=== Tweet creation process completed ===\n');
      
    } catch (error) {
      console.error('❌ Error in tweet creation process:', error);
    }
  }

  async start() {
    console.log('🚀 Enhanced Dova Tweet Bot starting...');
    console.log('📊 Tweet distribution: 83% value content, 17% promotional');
    console.log('🎯 Content types: Engagement hooks, Value posts, Motivational quotes, Thread teasers, Promos');
    
    await this.loadTweetHistory();
    
    try {
      console.log('Testing connections...');
      const me = await this.twitterClient.v2.me();
      console.log('✅ Twitter connected. User:', me.data.username);
      
      await this.openai.models.list();
      console.log('✅ OpenAI connected successfully');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return;
    }
    
    console.log('📢 Posting initial tweet...');
    await this.createAndPostTweet();
    
    // Schedule diverse tweets every 4 hours
    console.log('⏰ Scheduling diverse content every 4 hours...');
    cron.schedule('0 */4 * * *', async () => {
      await this.createAndPostTweet();
    });
    
    console.log('✅ Enhanced tweet bot is running!');
    console.log('📈 Building audience with valuable content');
    console.log('🔄 Next tweet in 4 hours');
    console.log('Press Ctrl+C to stop the bot.');
  }
}

// Create and start the bot
const bot = new DovaTweetBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Enhanced Dova Tweet Bot shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Enhanced Dova Tweet Bot shutting down gracefully...');
  process.exit(0);
});

// Start the bot
console.log('🎯 Initializing Enhanced Dova Tweet Bot...');
console.log('🚀 Now with diverse content strategy!');
bot.start().catch(console.error);

module.exports = DovaTweetBot;