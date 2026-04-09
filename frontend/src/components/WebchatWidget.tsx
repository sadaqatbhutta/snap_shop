import React from 'react';

type WebchatWidgetProps = {
  businessId: string;
  apiBase?: string;
  title?: string;
  position?: 'left' | 'right';
};

export default function WebchatWidget({
  businessId,
  apiBase = window.location.origin,
  title = 'Chat with us',
  position = 'right',
}: WebchatWidgetProps) {
  const embedCode = `<script src="${apiBase}/webchat-widget.js" data-business-id="${businessId}" data-api-base="${apiBase}" data-title="${title}" data-position="${position}" defer></script>`;
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
      <p className="text-sm font-semibold text-gray-800 mb-2">Webchat Widget Embed</p>
      <pre className="text-xs bg-white border border-gray-200 rounded p-3 overflow-x-auto">{embedCode}</pre>
    </div>
  );
}
