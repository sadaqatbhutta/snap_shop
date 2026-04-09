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
  root.style.fontFamily = 'Arial, sans-serif';

  var bubble = document.createElement('button');
  bubble.textContent = 'Chat';
  bubble.style.background = '#4f46e5';
  bubble.style.color = '#fff';
  bubble.style.border = 'none';
  bubble.style.borderRadius = '999px';
  bubble.style.padding = '12px 16px';
  bubble.style.cursor = 'pointer';
  bubble.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';

  var panel = document.createElement('div');
  panel.style.width = '320px';
  panel.style.height = '420px';
  panel.style.background = '#fff';
  panel.style.border = '1px solid #e5e7eb';
  panel.style.borderRadius = '12px';
  panel.style.boxShadow = '0 16px 40px rgba(0,0,0,0.2)';
  panel.style.display = 'none';
  panel.style.overflow = 'hidden';
  panel.style.marginBottom = '12px';

  var header = document.createElement('div');
  header.style.background = '#4f46e5';
  header.style.color = '#fff';
  header.style.padding = '12px';
  header.style.fontWeight = 'bold';
  header.textContent = title;

  var messages = document.createElement('div');
  messages.style.height = '310px';
  messages.style.padding = '12px';
  messages.style.overflowY = 'auto';
  messages.style.background = '#f9fafb';

  var form = document.createElement('form');
  form.style.display = 'flex';
  form.style.gap = '8px';
  form.style.padding = '10px';
  form.style.borderTop = '1px solid #e5e7eb';

  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type your message...';
  input.style.flex = '1';
  input.style.border = '1px solid #d1d5db';
  input.style.borderRadius = '8px';
  input.style.padding = '8px 10px';

  var sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.textContent = 'Send';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '8px';
  sendBtn.style.padding = '8px 12px';
  sendBtn.style.background = '#4f46e5';
  sendBtn.style.color = '#fff';
  sendBtn.style.cursor = 'pointer';

  function addMessage(text, mine) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '8px';
    wrap.style.textAlign = mine ? 'right' : 'left';

    var chip = document.createElement('span');
    chip.textContent = text;
    chip.style.display = 'inline-block';
    chip.style.maxWidth = '85%';
    chip.style.padding = '8px 10px';
    chip.style.borderRadius = '10px';
    chip.style.fontSize = '13px';
    chip.style.background = mine ? '#4f46e5' : '#ffffff';
    chip.style.color = mine ? '#fff' : '#111827';
    chip.style.border = mine ? 'none' : '1px solid #e5e7eb';

    wrap.appendChild(chip);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

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
    } catch (err) {
      addMessage('Sorry, something went wrong. Please try again.', false);
    } finally {
      sendBtn.disabled = false;
    }
  });

  bubble.addEventListener('click', function () {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
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
