require('dotenv').config();
const {Botkit} = require('botkit');
const {SlackAdapter} = require('botbuilder-adapter-slack');
const {CronJob, CronTime} = require('cron');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
  console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
  process.exit(1);
}

const adapter = new SlackAdapter({
  // verificationToken: process.env.VERIFICATION_TOKEN,
  botToken: process.env.OAUTH_TOKEN,
  clientSigningSecret: process.env.SIGNING_SECRET,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  scopes: ['user']
});

const controller = new Botkit({
  adapter
});

const cronEnum = {
  WORK: 'work',
  REST: 'rest',
}

async function setupCronJob(bot, message, work = 25, rest = 5) {
  // TODO: add start and end dates
  //
  const {user} = message;
  const cronWork = new CronTime(`*/1 * * * *`);
  const cronRest = new CronTime(`*/1 * * * *`);

  let cronCurrent = cronEnum.WORK;
  const job = new CronJob(cronWork.source, async function () {
    if (cronCurrent === cronEnum.WORK) {
      console.log('WORKING');
      await bot.api.users.profile.set({
        profile: {
          status_text: 'POMODORO',
          status_emoji: ':tomato:'
        },
        user,
      });
      await bot.api.dnd.setSnooze({
        num_minutes: work
      })
    } else {
      console.log('RESTING');
      await bot.api.users.profile.set({
        profile: {
          status_text: 'AVAILABLE',
          status_emoji: ''
        },
        user,
      });
    }
  }, null, true);
  job.addCallback(function () {
    if (cronCurrent === cronEnum.WORK) {
      console.log('CHANGING TO REST');
      job.setTime(cronRest);
      cronCurrent = cronEnum.REST;
    } else {
      console.log('CHANGING TO WORK');
      job.setTime(cronWork);
      cronCurrent = cronEnum.WORK;
    }
  });
  job.start();
}

controller.on('slash_command', async (bot, message) => {
  const work = 1;
  const rest = 1;
  await setupCronJob(bot, message, work, rest)
})
