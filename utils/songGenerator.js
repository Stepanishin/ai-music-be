import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY_OPENROUTER,
  dangerouslyAllowBrowser: true,
});

async function generateSongAudio(lyrics, genre) {
  console.log('generateSongAudio Начало генерации аудио песни...');
  console.log('generateSongAudio Жанр песни:', genre);
  console.log('process.env.OPENAI_API_KEY_OPENROUTER', process.env.OPENAI_API_KEY_OPENROUTER)

  if (!lyrics || lyrics.trim() === '') {
    throw new Error('Текст песни отсутствует. Невозможно сгенерировать аудио.');
  }

  // let prompt = lyrics.trim();
  // if (prompt.length > 200) {
  //   prompt = prompt.substring(0, 200);
  //   console.warn('Текст песни был обрезан до 200 символов для соответствия требованиям API.');
  // }
  console.log('check-1')
  async function gptResponse(text) {
    console.log('gptResponse Текст песни:', text)
    const prompt = `Generate a song based on the following lyrics: ${text}..
    `;
    try {
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: `${prompt}` }],
      model: "openchat/openchat-7b:free",
      max_tokens: 900,
    });
    console.log('gptResponse completion:', completion.choices[0].message)
    return (completion.choices[0].message.content);
  } catch (error) {
    console.error('Ошибка при запросе к API OpenAI:', error.message);
    throw new Error('Не удалось сгенерировать аудио песню');
  }
    
  }
  console.log('check-2')
  let prompt = await gptResponse(lyrics);
  console.log('check-3')

  console.log('generateSongAudio Текст песни:', prompt)

  try {
    const createResponse = await axios.post(
      'https://api.goapi.ai/api/suno/v1/music',
      {
        custom_mode: true,
        input: {
          gpt_description_prompt: prompt,
          make_instrumental: false,
          tags: genre,
          prompt: prompt,
          title: "",
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.SUNO_API_KEY,
        },
      }
    );

    if (createResponse.data.code !== 200) {
      console.error('Ошибка при создании задачи:', createResponse.data.message);
      throw new Error('Не удалось создать задачу генерации аудио песни');
    }

    const taskId = createResponse.data.data.task_id;
    console.log(`Задача создана, task_id: ${taskId}`);

    let songUrl = null;
    let videoUrl = null
    let maxAttempts = 20;
    let attempt = 0;
    const delay = 60000;

    while (attempt < maxAttempts) {
      try {
        console.log(`Попытка ${attempt + 1} проверки статуса задачи...`);
        const getResponse = await axios.get(
          `https://api.goapi.ai/api/suno/v1/music/${taskId}`,
          {
            headers: {
              'X-API-Key': process.env.SUNO_API_KEY,
            },
          }
        );

        if (getResponse.data.code !== 200) {
          console.error('Ошибка при получении статуса задачи:', getResponse.data.message);
          throw new Error('Не удалось получить статус задачи генерации аудио песни');
        }

        const taskData = getResponse.data.data;
        console.log('Получен ответ от API:', taskData);

        if (taskData.status === 'success' || taskData.status === 'completed') {
          songUrl = taskData.clips[Object.keys(taskData.clips)[0]].audio_url;
          videoUrl = taskData.clips[Object.keys(taskData.clips)[0]].video_url;
          console.log(`Аудио песня успешно сгенерирована: ${songUrl}`);
          break;
        } else if (taskData.status === 'pending' || taskData.status === 'processing') {
          console.log('Задача ещё в обработке, ожидаем...');
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (taskData.status === 'error') {
          console.error('Ошибка при генерации аудио песни:', taskData.error_message || 'Неизвестная ошибка');
          throw new Error('Не удалось сгенерировать аудио песню');
        } else {
          console.error('Получен неизвестный статус задачи:', taskData.status);
          throw new Error(`Неизвестный статус задачи: ${taskData.status}`);
        }
      } catch (error) {
        if (error.response && error.response.status === 520) {
          console.warn('Ошибка 520, повторяем запрос...');
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          throw error; // Если ошибка не 520, прерываем цикл
        }
      }
      attempt++;
    }

    if (!songUrl) {
      console.error('Превышено максимальное количество попыток ожидания генерации аудио песни.');
      throw new Error('Не удалось сгенерировать аудио песню в отведённое время');
    }

    return { songUrl, videoUrl };
  } catch (error) {
    if (error.response) {
      console.error('Ошибка API SUNO AI:', error.response.status, error.response.data);
    } else {
      console.error('Ошибка при запросе к API SUNO AI:', error.message);
    }
    throw new Error('Не удалось сгенерировать аудио песню');
  }
}

async function generateSong({ story, genre }) {
  let attempts = 0;
  const maxRetries = 5;

  while (attempts < maxRetries) {
    try {
      const songUrl = await generateSongAudio(story, genre);
      return songUrl; // Успешное завершение
    } catch (error) {
      attempts++;
      console.warn(`Попытка ${attempts} генерации песни завершилась неудачей.`);
      if (attempts === maxRetries) {
        console.error('Все попытки генерации песни исчерпаны.');
        throw new Error('Не удалось сгенерировать аудио песню после нескольких попыток');
      }
    }
  }
}

export { generateSong };
