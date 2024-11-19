// server/utils/emailSender.js
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import dotenv from 'dotenv';

dotenv.config();

const mailerSend = new MailerSend({
  apiKey: process.env.EMAIL_SENDER_API_KEY,
});

const sentFrom = new Sender("aimusic@trial-ynrw7gyzd6r42k8e.mlsender.net", "AI Music Team");

async function sendEmailWithSong(toEmail, songData) {
  const { songUrl, videoUrl } = songData;
  const recipients = [
    new Recipient(toEmail, toEmail)
  ];

  const websiteUrl = process.env.WEBSITE_URL || 'https://my-aimusic.com/';

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Your personalized song is ready!")
    .setHtml(`
      <p>Hey there!</p>
      <p>Your personalized song is ready. You can listen to it here:</p>
      <p><a href="${songUrl}">🎵 Listen to your song</a></p>
      <p>We also made a cool video for you:</p>
      <p><a href="${videoUrl}">🎬 Watch your video</a></p>
      <p>Thanks for using our service!</p>
      <p>Want more personalized songs? Visit our website to order more!</p>
      <p><a href="${websiteUrl}" style="display:inline-block;padding:10px 20px;background-color:#1D4ED8;color:#ffffff;text-decoration:none;border-radius:5px;">Order another song</a></p>
      <p>Cheers,<br/>The AI Music Team</p>
    `)
    .setText(`
      Hey there!

      Your personalized song is ready. You can listen to it here:
      ${songUrl}

      We also made a cool video for you:
      ${videoUrl}

      Thanks for using our service!

      Want more personalized songs? Visit our website to order more:
      ${websiteUrl}

      Cheers,
      The AI Music Team
    `);

  await mailerSend.email.send(emailParams);
}

export { sendEmailWithSong };
