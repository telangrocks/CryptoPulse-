# CryptoPulse Backend

Back4App cloud functions for the CryptoPulse trading platform.

## Cloud Functions

The `cloud-functions.js` file contains all the necessary Parse Cloud Functions for:

- User authentication and management
- API key management with encryption
- Trade execution and history
- Market data retrieval
- AI assistant functionality
- Performance analytics
- Bot configuration and monitoring

## Deployment

1. Copy the contents of `cloud-functions.js`
2. Deploy to your Back4App dashboard
3. Configure environment variables in Back4App
4. Test the functions using the Parse dashboard

## Environment Variables

Configure these in your Back4App dashboard:

- `BACK4APP_APP_ID`
- `BACK4APP_JAVASCRIPT_KEY`
- `BACK4APP_MASTER_KEY`
- `BACK4APP_SERVER_URL`

## Database Schema

The functions expect these Parse classes:

- `_User` - User accounts
- `ApiKeys` - Encrypted API keys
- `TradeHistory` - Trading records
- `AISettings` - AI configuration
- `AlertSettings` - Notification settings
- `BotStatus` - Bot status tracking
