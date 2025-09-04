const core = require('@actions/core')
const github = require('@actions/github')
const https = require('https')
const simpleGit = require('simple-git');

const translations = {
  italian: {
    pretext: projectName => `Rilasciata la nuova versione di ${projectName}!`,
    text: changelogUrl => `Changelog disponibile qua: ${changelogUrl}`
  },
  russian: {
    pretext: projectName => `Выпущена новая версия ${projectName}!`,
    text: changelogUrl => `Список изменений доступен здесь: ${changelogUrl}`
  },
  polish: {
    pretext: projectName => `Wydano nową wersję ${projectName}!`,
    text: changelogUrl => `Lista zmian dostępna tutaj: ${changelogUrl}`
  },
  french: {
    pretext: projectName => `Nouvelle version de ${projectName} publiée!`,
    text: changelogUrl => `Journal des modifications disponible ici: ${changelogUrl}`
  },
  spanish: {
    pretext: projectName => `¡Nueva versión de ${projectName} lanzada!`,
    text: changelogUrl => `Registro de cambios disponible aquí: ${changelogUrl}`
  }
}

const main = async () => {
  const currentRepoGit = simpleGit();
  const tags = (await currentRepoGit.tags({'--sort' : 'taggerdate'})).all

  const version = tags.pop()
  const repoName = github.context.payload.repository.full_name
  const changelogUrl = `https://github.com/${repoName}/releases/tag/${version}`
  
  const slackToken = core.getInput('slack_token')
  const channelId = core.getInput('channel_id')
  const projectName = core.getInput('project_name')
  
  const languages = Object.keys(translations)
  const randomLanguage = languages[Math.floor(Math.random() * languages.length)]
  const selectedTranslation = translations[randomLanguage]
  
  const payload = JSON.stringify({
    channel: channelId,
    token: slackToken,
    attachments: [
      {
        pretext : selectedTranslation.pretext(projectName),
        text : selectedTranslation.text(changelogUrl),
      },
    ],
  })
  
  const requestOptions = {
    method: 'POST',
    port: 443,
    hostname: 'slack.com',
    path: '/api/chat.postMessage',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': payload.length,
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
      if (res.statusCode === 200) {
        const jsonResponse = JSON.parse(responseData)
        if (jsonResponse.ok === true) {
          core.setOutput('status', '✅ Message sent!')
          return
        }
      }
      core.setFailed(`❌ Failed request: ${responseData}`)
    })
  })

  messageRequest.on('error', () => {
    core.setFailed('Failed to fetch Slack')
  })

  messageRequest.write(payload)
  messageRequest.end()
}

main()
