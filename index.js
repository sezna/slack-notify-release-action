const core = require('@actions/core')
const github = require('@actions/github')
const https = require('https')
const simpleGit = require('simple-git');

const translations = {
  italian: {
    pretext: projectName => `Rilasciata la nuova versione di ${projectName}!`,
    text: () => `✨ Una nuova classe di mercanti sorgerà come il sole all'alba! 🌅`
  },
  russian: {
    pretext: projectName => `Выпущена новая версия ${projectName}!`,
    text: () => `✨ Новый класс торговцев взойдёт, как восходящее солнце! 🌅`
  },
  polish: {
    pretext: projectName => `Wydano nową wersję ${projectName}!`,
    text: () => `✨ Nowa klasa kupców powstanie jak wschodzące słońce! 🌅`
  },
  french: {
    pretext: projectName => `Nouvelle version de ${projectName} publiée!`,
    text: () => `✨ Une nouvelle classe de marchands s'élèvera comme le soleil levant! 🌅`
  },
  spanish: {
    pretext: projectName => `¡Nueva versión de ${projectName} lanzada!`,
    text: () => `✨ ¡Una nueva clase de comerciantes surgirá como el sol naciente! 🌅`
  },
  japanese: {
    pretext: projectName => `${projectName}の新バージョンがリリースされました！`,
    text: () => `✨ 新しい商人の階級が昇る太陽のように現れる！ 🌅`
  },
  swedish: {
    pretext: projectName => `Ny version av ${projectName} släppt!`,
    text: () => `✨ En ny köpmannaklasse kommer att resa sig som den uppgående solen! 🌅`
  },
  german: {
    pretext: projectName => `Neue Version von ${projectName} veröffentlicht!`,
    text: () => `✨ Eine neue Kaufmannsklasse wird wie die aufgehende Sonne aufsteigen! 🌅`
  }
}

const main = async () => {
  const currentRepoGit = simpleGit();
  const tags = (await currentRepoGit.tags({'--sort' : 'taggerdate'})).all

  const version = tags.pop()
  
  const slackToken = core.getInput('slack_token')
  const channelId = core.getInput('channel_id')
  const projectName = core.getInput('project_name')
  
  const languages = Object.keys(translations)
  const randomLanguage = languages[Math.floor(Math.random() * languages.length)]
  const selectedTranslation = translations[randomLanguage]
  
  // Debug logging
  console.log('=== Slack Notify Release Action Debug ===')
  console.log('Version:', version)
  console.log('Project Name:', projectName)
  console.log('Channel ID:', channelId)
  console.log('Selected Language:', randomLanguage)
  console.log('Pretext:', selectedTranslation.pretext(projectName))
  console.log('Text:', selectedTranslation.text())
  
  const payload = JSON.stringify({
    channel: channelId,
    attachments: [
      {
        pretext : selectedTranslation.pretext(projectName),
        text : selectedTranslation.text(),
      },
    ],
  })
  
  console.log('Payload being sent:', payload)
  console.log('Payload length (bytes):', Buffer.byteLength(payload, 'utf8'))
  
  const requestOptions = {
    method: 'POST',
    port: 443,
    hostname: 'slack.com',
    path: '/api/chat.postMessage',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload, 'utf8'),
      Authorization: `Bearer ${slackToken}`,
      Accept: 'application/json',
    },
  }

  const messageRequest = https.request(requestOptions, res => {
    let responseData = ''
    res.on('data', (d) => {
      responseData += d
    })
    res.on('end', () => {
      console.log('Response status code:', res.statusCode)
      console.log('Response data:', responseData)
      
      if (res.statusCode === 200) {
        try {
          const jsonResponse = JSON.parse(responseData)
          if (jsonResponse.ok === true) {
            console.log('Message sent successfully!')
            core.setOutput('status', '✅ Message sent!')
            return
          } else {
            console.error('Slack API returned ok=false:', jsonResponse.error)
          }
        } catch (e) {
          console.error('Failed to parse JSON response:', e)
          console.error('Raw response:', responseData)
        }
      }
      core.setFailed(`❌ Failed request: ${responseData}`)
    })
  })

  messageRequest.on('error', (err) => {
    console.error('Request error:', err)
    core.setFailed(`Failed to fetch Slack: ${err.message}`)
  })

  messageRequest.write(payload)
  messageRequest.end()
}

main()
