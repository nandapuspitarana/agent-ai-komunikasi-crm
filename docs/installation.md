# Widget Installation Guide

## Overview

The CRM Widget is a lightweight, embeddable chat interface that can be integrated into any website. It uses Shadow DOM to isolate styles and communicates with your CRM backend via WebSocket connections.

**Key Features:**
- 📦 Minimal bundle size (~50KB gzipped)
- 🎨 Fully customizable branding
- 🔒 Secure multi-tenant architecture
- ⚡ Real-time messaging via Socket.io
- 📱 Mobile-responsive design
- 🌐 Works on any website

---

## Quick Start (Copy-Paste)

### Step 1: Get Your Widget Script URL

Log in to your CRM dashboard and navigate to **Settings > Widget Installation**.

Your unique widget script URL will look like:
```
https://your-crm-domain.com/widget.min.js?tenantId=abc123
```

### Step 2: Add Script to Your Website

Copy and paste this single line into the `<head>` or before the closing `</body>` tag of your website:

```html
<script async src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"></script>
```

That's it! The widget will automatically initialize when the page loads.

---

## Advanced Installation

### Installation with Custom Configuration

For more control over widget behavior, use the initialization script:

```html
<!-- Load the widget -->
<script async src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"></script>

<!-- Configure widget (optional) -->
<script>
  window.addEventListener('CRMWidgetReady', function() {
    CRMWidget.configure({
      position: 'bottom-right',        // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
      theme: 'light',                  // 'light' or 'dark'
      primaryColor: '#2563eb',         // Hex color code
      showBranding: true,              // Show CRM branding
      animationsEnabled: true,         // Enable animations
      autoOpen: false                  // Auto-open widget on page load
    });
  });
</script>
```

### Installation with Environment Variables

For development/testing, you can override the tenant ID:

```html
<script>
  window.CRM_CONFIG = {
    tenantId: 'your-tenant-id',
    apiUrl: 'https://api.your-domain.com',
    socketUrl: 'https://your-crm-domain.com'
  };
</script>
<script async src="https://your-crm-domain.com/widget.min.js"></script>
```

---

## Installation on Different Platforms

### WordPress

Add to your WordPress theme's `functions.php`:

```php
add_action('wp_footer', function() {
    echo '<script async src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"></script>';
});
```

Or use a custom HTML code block in the page editor.

### Shopify

1. Go to **Online Store > Themes**
2. Click **Edit Code**
3. Find `theme.liquid`
4. Add before the closing `</body>` tag:

```liquid
<script async src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"></script>
```

### WooCommerce

Add to your child theme's `functions.php`:

```php
add_action('wp_footer', function() {
    if (is_front_page() || is_home()) {
        echo '<script async src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"></script>';
    }
});
```

### Wix

1. Go to **Settings > Custom Code**
2. Click **Add Code**
3. Select **Body - Start of Page** or **Footer**
4. Paste:

```html
<script async src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"></script>
```

### Squarespace

1. Go to **Website > Website Tools > Code Injection**
2. Paste in **Footer** section:

```html
<script async src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"></script>
```

### React Application

```jsx
import { useEffect } from 'react';

export default function MyApp() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://your-crm-domain.com/widget.min.js?tenantId=abc123';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return <div>Your app content</div>;
}
```

### Vue Application

```vue
<template>
  <div id="app">
    <!-- Your app content -->
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://your-crm-domain.com/widget.min.js?tenantId=abc123';
    script.async = true;
    document.head.appendChild(script);
  }
}
</script>
```

### Next.js Application

Create `pages/_document.js`:

```jsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <script
          async
          src="https://your-crm-domain.com/widget.min.js?tenantId=abc123"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

---

## Configuration Options

### Available Configuration Parameters

```javascript
CRMWidget.configure({
  // Display & Layout
  position: 'bottom-right',           // Widget position
  theme: 'light',                     // Color theme
  primaryColor: '#2563eb',            // Primary brand color
  secondaryColor: '#1e40af',          // Secondary color
  borderRadius: '16',                 // Button border radius (px)
  
  // Text & Messaging
  headerText: 'Chat with us',         // Widget header
  headerSubtext: 'We reply quickly',  // Subtitle
  placeholderText: 'Type here...',   // Input placeholder
  welcomeMessage: 'Hi! How can we help?', // Initial greeting
  
  // Behavior
  animationsEnabled: true,            // Enable animations
  autoOpen: false,                    // Auto-open on load
  showBranding: true,                 // Show CRM attribution
  notificationSound: true,            // Play notification sounds
  
  // Advanced
  debugMode: false,                   // Enable debug logging
  customCSS: '',                      // Custom CSS string
  reconnectAttempts: 5,               // Socket reconnection attempts
  reconnectDelay: 1000                // Delay between reconnection (ms)
});
```

### Event Listeners

```javascript
// Widget opened
window.addEventListener('CRMWidget:opened', function() {
  console.log('Widget opened');
});

// Widget closed
window.addEventListener('CRMWidget:closed', function() {
  console.log('Widget closed');
});

// Message received
window.addEventListener('CRMWidget:messageReceived', function(event) {
  console.log('Message:', event.detail.message);
});

// Connection established
window.addEventListener('CRMWidget:connected', function() {
  console.log('Widget connected to server');
});

// Connection lost
window.addEventListener('CRMWidget:disconnected', function() {
  console.log('Widget disconnected');
});
```

---

## Troubleshooting

### Widget Not Appearing

1. **Check Script URL**: Verify the script URL is correct and accessible
   ```javascript
   console.log(typeof CRMWidget); // Should print "object"
   ```

2. **Check Browser Console**: Look for JavaScript errors
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any error messages

3. **Check Tenant ID**: Ensure `tenantId` is valid
   ```javascript
   console.log(window.location.search); // Should contain tenantId
   ```

4. **Check CORS Settings**: Ensure your website domain is whitelisted
   - Go to CRM Settings > Allowed Domains
   - Add your website domain

### Widget Not Connecting

1. **Check Server Status**: Verify CRM server is running
   ```bash
   curl https://your-crm-domain.com/api/health
   ```

2. **Check Network Tab**: In DevTools, look at Network tab for Socket.io connection
   - Should see WebSocket connection to `/socket.io`
   - Should show status `101 Switching Protocols`

3. **Check Firewall**: Ensure WebSocket connections are allowed
   - Ports 80, 443, and 3000 should be open

### Styling Issues

1. **Check Shadow DOM**: Widget uses Shadow DOM for style isolation
   - To debug, check DevTools settings: **Show user agent shadow DOM**

2. **Custom CSS Not Applied**: Use the `customCSS` option
   ```javascript
   CRMWidget.configure({
     customCSS: `
       .widget-button { background: red; }
     `
   });
   ```

3. **Mobile Display Issues**: Use responsive breakpoints
   ```javascript
   if (window.innerWidth < 768) {
     CRMWidget.configure({ position: 'bottom-left' });
   }
   ```

---

## Performance Tips

### Optimize Load Time

1. **Use async script loading** (already in examples)
2. **Lazy load widget** - Only initialize when needed:

```javascript
let widgetLoaded = false;

document.querySelector('.chat-button')?.addEventListener('click', () => {
  if (!widgetLoaded) {
    const script = document.createElement('script');
    script.src = 'https://your-crm-domain.com/widget.min.js?tenantId=abc123';
    script.async = true;
    document.head.appendChild(script);
    widgetLoaded = true;
  }
  CRMWidget.open();
});
```

3. **Use CDN for faster delivery**:
```html
<!-- CDN URL (when available) -->
<script async src="https://cdn.crm-widget.io/widget.min.js?tenantId=abc123"></script>
```

### Monitor Performance

```javascript
// Measure widget load time
const startTime = performance.now();

window.addEventListener('CRMWidget:ready', () => {
  const loadTime = performance.now() - startTime;
  console.log(`Widget loaded in ${loadTime}ms`);
  
  // Track in analytics
  gtag('event', 'widget_loaded', { load_time: loadTime });
});
```

---

## Security

### Best Practices

1. **Always use HTTPS** for production
2. **Never expose sensitive data** in widget configuration
3. **Validate tenant IDs** on backend
4. **Use Content Security Policy (CSP)** headers:

```
script-src 'self' https://your-crm-domain.com;
connect-src 'self' https://your-crm-domain.com wss://your-crm-domain.com;
frame-src 'none';
```

5. **Monitor widget traffic** for suspicious patterns

---

## Support & Resources

- **Documentation**: https://your-crm-domain.com/docs/widget
- **API Reference**: https://your-crm-domain.com/docs/widget-api
- **GitHub Issues**: https://github.com/yourorg/crm-widget/issues
- **Email Support**: support@your-crm-domain.com

---

## Version Updates

Current version: **1.0.0**

To stay updated with latest features and security patches:

1. Check **Settings > Widget Version** in CRM dashboard
2. Subscribe to release notifications
3. Review changelog: https://your-crm-domain.com/docs/widget-changelog

**Update your script URL** when new versions are available.

---

## License

The CRM Widget is provided under the MIT License. See LICENSE file for details.
