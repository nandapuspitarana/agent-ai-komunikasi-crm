import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const credentialsCache = new Map<string, { credentials: GoogleCredentials; expiresAt: number }>();


/**
 * Google Sheets Integration
 * Handles OAuth2 authentication and append/read operations to Google Sheets
 */

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  range?: string;
}

export interface GoogleCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
}

export class GoogleSheetsIntegration {
  private oauth2Client: OAuth2Client;
  private readonly CACHE_TTL_MS = 3600 * 1000; // 1 hour

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(tenantId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: tenantId, // Use tenant ID as state for verification
    });
  }

  /**
   * Handle OAuth2 callback and store credentials
   */
  async handleAuthCallback(code: string, tenantId: string): Promise<GoogleCredentials> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      const credentials: GoogleCredentials = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expiry_date: tokens.expiry_date || 0,
        token_type: tokens.token_type || 'Bearer',
      };

      // Save credentials encrypted in database
      const existingIntegration = await prisma.integration.findFirst({
        where: {
          tenantId,
          provider: 'google_sheets',
        },
      });

      if (existingIntegration) {
        await prisma.integration.update({
          where: { id: existingIntegration.id },
          data: {
            apiKey: JSON.stringify(credentials),
            isActive: true,
          },
        });
      } else {
        await prisma.integration.create({
          data: {
            tenantId,
            provider: 'google_sheets',
            apiKey: JSON.stringify(credentials),
            isActive: true,
          },
        });
      }

      // Cache in memory
      credentialsCache.set(tenantId, {
        credentials,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return credentials;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Get stored credentials for a tenant
   */
  async getCredentials(tenantId: string): Promise<GoogleCredentials | null> {
    // Try cache first
    const cached = credentialsCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.credentials;
    }

    // Fetch from database
    const integration = await prisma.integration.findFirst({
      where: {
        tenantId,
        provider: 'google_sheets',
      },
    });

    if (!integration || !integration.apiKey) {
      return null;
    }

    let credentials: GoogleCredentials;
    try {
      credentials = JSON.parse(integration.apiKey) as GoogleCredentials;
    } catch (e) {
      return null;
    }

    // Cache for 1 hour
    credentialsCache.set(tenantId, {
      credentials,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return credentials;
  }

  /**
   * Append data to Google Sheet
   */
  async appendToSheet(
    tenantId: string,
    config: GoogleSheetsConfig,
    values: any[][]
  ): Promise<any> {
    try {
      const credentials = await this.getCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Sheets credentials not found. Please authorize first.');
      }

      this.oauth2Client.setCredentials(credentials);

      // Refresh token if expired
      if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
        await this._refreshAccessToken(tenantId, credentials);
      }

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client as any });

      const range = config.range || `${config.sheetName}!A:Z`;

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });

      console.log(`[Google Sheets] Appended ${values.length} rows to ${config.sheetName}`);

      return {
        success: true,
        updates: response.data.updates,
        spreadsheetId: response.data.spreadsheetId,
      };
    } catch (error) {
      console.error('Google Sheets append error:', error);
      throw error;
    }
  }

  /**
   * Read data from Google Sheet
   */
  async readFromSheet(
    tenantId: string,
    config: GoogleSheetsConfig,
    rowCount?: number
  ): Promise<any[][]> {
    try {
      const credentials = await this.getCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Sheets credentials not found. Please authorize first.');
      }

      this.oauth2Client.setCredentials(credentials);

      // Refresh token if expired
      if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
        await this._refreshAccessToken(tenantId, credentials);
      }

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client as any });

      const range = config.range || `${config.sheetName}!A:Z`;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range,
      });

      let data = response.data.values || [];

      if (rowCount) {
        data = data.slice(0, rowCount);
      }

      console.log(`[Google Sheets] Read ${data.length} rows from ${config.sheetName}`);

      return data;
    } catch (error) {
      console.error('Google Sheets read error:', error);
      throw error;
    }
  }

  /**
   * Update cells in Google Sheet
   */
  async updateSheet(
    tenantId: string,
    config: GoogleSheetsConfig,
    values: any[][]
  ): Promise<any> {
    try {
      const credentials = await this.getCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Sheets credentials not found. Please authorize first.');
      }

      this.oauth2Client.setCredentials(credentials);

      // Refresh token if expired
      if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
        await this._refreshAccessToken(tenantId, credentials);
      }

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client as any });

      const range = config.range || `${config.sheetName}!A1`;

      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });

      console.log(`[Google Sheets] Updated ${range}`);

      return {
        success: true,
        updatedCells: response.data.updatedCells,
        updatedColumns: response.data.updatedColumns,
        updatedRows: response.data.updatedRows,
      };
    } catch (error) {
      console.error('Google Sheets update error:', error);
      throw error;
    }
  }

  /**
   * Clear a range in Google Sheet
   */
  async clearSheet(
    tenantId: string,
    spreadsheetId: string,
    range: string
  ): Promise<any> {
    try {
      const credentials = await this.getCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Sheets credentials not found. Please authorize first.');
      }

      this.oauth2Client.setCredentials(credentials);

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client as any });

      const response = await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });

      console.log(`[Google Sheets] Cleared ${range}`);

      return {
        success: true,
        clearedRange: response.data.clearedRange,
      };
    } catch (error) {
      console.error('Google Sheets clear error:', error);
      throw error;
    }
  }

  /**
   * Get sheet metadata
   */
  async getSheetMetadata(tenantId: string, spreadsheetId: string): Promise<any> {
    try {
      const credentials = await this.getCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Sheets credentials not found. Please authorize first.');
      }

      this.oauth2Client.setCredentials(credentials);

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client as any });

      const response = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      return response.data;
    } catch (error) {
      console.error('Google Sheets metadata error:', error);
      throw error;
    }
  }

  /**
   * Internal: Refresh access token
   */
  private async _refreshAccessToken(
    tenantId: string,
    credentials: GoogleCredentials
  ): Promise<GoogleCredentials> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refresh_token,
      });

      const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();

      const updated: GoogleCredentials = {
        access_token: newCredentials.access_token || '',
        refresh_token: newCredentials.refresh_token || credentials.refresh_token,
        expiry_date: newCredentials.expiry_date || 0,
        token_type: newCredentials.token_type || 'Bearer',
      };

      // Update in database
      await prisma.integration.updateMany({
        where: {
          tenantId,
          provider: 'google_sheets',
        },
        data: {
          apiKey: JSON.stringify(updated),
        },
      });

      // Update cache
      credentialsCache.set(tenantId, {
        credentials: updated,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return updated;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }
}

export const googleSheetsIntegration = new GoogleSheetsIntegration();
