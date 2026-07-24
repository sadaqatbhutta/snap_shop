/* SnapShop Webchat Widget */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var businessId = script.getAttribute('data-business-id');
  if (!businessId) {
    console.error('SnapShop widget: missing data-business-id');
    return;
  }

  var apiBase = (script.getAttribute('data-api-base') || window.location.origin).replace(/\/$/, '');
  var position = script.getAttribute('data-position') || 'right';
  var title = script.getAttribute('data-title') || 'Chat with us';

  var storageKey = 'snapshop_webchat_user_id_' + businessId;
  var userId = localStorage.getItem(storageKey);
  if (!userId) {
    userId = 'web_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(storageKey, userId);
  }

  var root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.bottom = '20px';
  root.style[position === 'left' ? 'left' : 'right'] = '20px';
  root.style.zIndex = '999999';
  root.style.fontFamily = 'Sora, Segoe UI, sans-serif';

  var bubble = document.createElement('button');
  bubble.textContent = 'Chat';
  bubble.style.background = '#0f766e';
  bubble.style.color = '#fff';
  bubble.style.border = 'none';
  bubble.style.borderRadius = '14px';
  bubble.style.padding = '12px 16px';
  bubble.style.cursor = 'pointer';
  bubble.style.boxShadow = '0 8px 24px rgba(15,118,110,0.28)';

  var panel = document.createElement('div');
  panel.style.width = '320px';
  panel.style.height = '420px';
  panel.style.background = '#fff';
  panel.style.border = '1px solid rgba(15,35,40,0.1)';
  panel.style.borderRadius = '16px';
  panel.style.boxShadow = '0 16px 40px rgba(0,0,0,0.18)';
  panel.style.display = 'none';
  panel.style.overflow = 'hidden';
  panel.style.marginBottom = '12px';

  var header = document.createElement('div');
  header.style.background = '#0b1324';
  header.style.color = '#fff';
  header.style.padding = '12px';
  header.style.fontWeight = '600';
  header.textContent = title;

  var messages = document.createElement('div');
  messages.style.height = '310px';
  messages.style.padding = '12px';
  messages.style.overflowY = 'auto';
  messages.style.background = '#f7faf8';

  var form = document.createElement('form');
  form.style.display = 'flex';
  form.style.gap = '8px';
  form.style.padding = '10px';
  form.style.borderTop = '1px solid rgba(15,35,40,0.1)';

  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type your message...';
  input.style.flex = '1';
  input.style.border = '1px solid #d1d5db';
  input.style.borderRadius = '10px';
  input.style.padding = '8px 10px';

  var sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.textContent = 'Send';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '10px';
  sendBtn.style.padding = '8px 12px';
  sendBtn.style.background = '#0f766e';
  sendBtn.style.color = '#fff';
  sendBtn.style.cursor = 'pointer';

  var seenAgentIds = {};

  function addMessage(text, mine) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '8px';
    wrap.style.textAlign = mine ? 'right' : 'left';

    var chip = document.createElement('span');
    chip.textContent = text;
    chip.style.display = 'inline-block';
    chip.style.maxWidth = '85%';
    chip.style.padding = '8px 10px';
    chip.style.borderRadius = '12px';
    chip.style.fontSize = '13px';
    chip.style.background = mine ? '#0f766e' : '#ffffff';
    chip.style.color = mine ? '#fff' : '#111827';
    chip.style.border = mine ? 'none' : '1px solid #e5e7eb';

    wrap.appendChild(chip);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  async function pollAgentReplies() {
    try {
      var resp = await fetch(apiBase + '/api/webchat/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, user_id: userId }),
      });
      if (!resp.ok) return;
      var data = await resp.json();
      (data.messages || []).forEach(function (m) {
        if (!m || !m.id || seenAgentIds[m.id]) return;
        seenAgentIds[m.id] = true;
        addMessage(m.message, false);
      });
    } catch (e) {
      /* ignore poll errors */
    }
  }

  setInterval(pollAgentReplies, 4000);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;

    addMessage(text, true);
    input.value = '';
    sendBtn.disabled = true;

    try {
      var resp = await fetch(apiBase + '/api/webchat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          user_id: userId,
          message: text,
          type: 'text',
          name: 'Website Visitor'
        })
      });
      var data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || 'Failed to send');
      }
      if (data.reply) {
        addMessage(data.reply, false);
      }
      await pollAgentReplies();
    } catch (err) {
      addMessage('Sorry, something went wrong. Please try again.', false);
    } finally {
      sendBtn.disabled = false;
    }
  });

  bubble.addEventListener('click', function () {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') pollAgentReplies();
  });

  form.appendChild(input);
  form.appendChild(sendBtn);
  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(form);
  root.appendChild(panel);
  root.appendChild(bubble);
  document.body.appendChild(root);
})();
