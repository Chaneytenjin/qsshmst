/**
 * QSSH Gmail 授權離線指令 — Google Apps Script
 *
 * 1. 將本檔貼到 script.google.com 新建的專案。
 * 2. 在「專案設定 → 指令碼屬性」設定：
 *    QSSH_OFFLINE_ENDPOINT：系統維護頁顯示的 Apps Script 指令端點。
 *    QSSH_OFFLINE_SECRET：系統維護頁「輪替 Apps Script 簽章密鑰」顯示的一次性密鑰。
 *    QSSH_OFFLINE_RECIPIENT：系統通知 Gmail 地址。
 * 3. 執行 installQsshOfflineTrigger 一次並依 Google 介面授權。
 * 4. 在 Gmail 建立篩選器，為授權寄件者、固定主旨的郵件套用 QSSH_OFFLINE_COMMAND 標籤。
 */

const QSSH_LABEL = 'QSSH_OFFLINE_COMMAND';
const QSSH_PROCESSED_LABEL = 'QSSH_OFFLINE_PROCESSED';
const QSSH_REJECTED_LABEL = 'QSSH_OFFLINE_REJECTED';
const QSSH_SUBJECT = 'QSSH MEDIA SERVICE SYSTEM';
const QSSH_COMMAND_BODY = 'Media Server System is abnormal,Please go offline immediately.';

function installQsshOfflineTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'checkQsshOfflineCommand')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('checkQsshOfflineCommand').timeBased().everyMinutes(1).create();
}

function checkQsshOfflineCommand() {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = requiredProperty_(properties, 'QSSH_OFFLINE_ENDPOINT');
  const secret = requiredProperty_(properties, 'QSSH_OFFLINE_SECRET');
  const recipientEmail = requiredProperty_(properties, 'QSSH_OFFLINE_RECIPIENT').toLowerCase();
  const processedLabel = getOrCreateLabel_(QSSH_PROCESSED_LABEL);
  const rejectedLabel = getOrCreateLabel_(QSSH_REJECTED_LABEL);
  const threads = GmailApp.search(`label:${QSSH_LABEL} -label:${QSSH_PROCESSED_LABEL} -label:${QSSH_REJECTED_LABEL} subject:"${QSSH_SUBJECT}"`, 0, 10);

  threads.forEach((thread) => {
    thread.getMessages().forEach((message) => {
      if (message.getSubject().trim().toUpperCase() !== QSSH_SUBJECT) return;
      if (message.getPlainBody().trim() !== QSSH_COMMAND_BODY) return;
      const payload = {
        messageId: message.getId(),
        senderEmail: extractEmail_(message.getFrom()),
        recipientEmail,
        subject: message.getSubject(),
        commandBody: QSSH_COMMAND_BODY,
        authenticationPassed: hasAuthenticatedSender_(message),
        timestamp: Date.now(),
      };
      const signature = toBase64Url_(Utilities.computeHmacSha256Signature(canonicalPayload_(payload), secret));
      const response = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ ...payload, signature }),
        muteHttpExceptions: true,
      });
      const status = response.getResponseCode();
      const result = parseResponse_(response.getContentText());
      if (status >= 200 && status < 300 && result.accepted === true) {
        thread.addLabel(processedLabel);
      } else if (status >= 400 && status < 500 || (status >= 200 && status < 300 && result.code === 'gmail_replay_rejected')) {
        thread.addLabel(rejectedLabel);
        console.warn(`QSSH 離線指令遭系統拒絕：${result.code || `HTTP ${status}`}；請查看系統收件稽核。`);
      } else {
        console.warn(`QSSH 離線指令暫時未完成：${result.code || `HTTP ${status}`}；信件將保留供下一次重試。`);
      }
    });
  });
}

function requiredProperty_(properties, key) {
  const value = properties.getProperty(key);
  if (!value) throw new Error(`缺少 Script Property：${key}`);
  return value;
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function extractEmail_(value) {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : value).trim().toLowerCase();
}

function canonicalPayload_(payload) {
  return [payload.messageId, payload.senderEmail, payload.recipientEmail, payload.subject, payload.commandBody, payload.authenticationPassed ? '1' : '0', String(payload.timestamp)].join('\n');
}

function hasAuthenticatedSender_(message) {
  const directHeader = message.getHeader('Authentication-Results') || '';
  const rawHeaders = String(message.getRawContent())
    .split(/\r?\n\r?\n/, 1)[0]
    .replace(/\r?\n[ \t]+/g, ' ');
  const rawAuthenticationResults = (rawHeaders.match(/^authentication-results:\s*(.+)$/im) || [])[1] || '';
  const authenticationResults = `${directHeader}\n${rawAuthenticationResults}`;
  return /\bspf=pass\b/i.test(authenticationResults)
    && /\bdkim=pass\b/i.test(authenticationResults)
    && /\bdmarc=pass\b/i.test(authenticationResults);
}

function toBase64Url_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function parseResponse_(content) {
  try {
    const parsed = JSON.parse(content || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}
