/**
 * Spellcasters' Arena: Database & Auth Layer
 * Integrates with kvdb.io for simple serverless storage, falls back to localStorage.
 */

class DatabaseManager {
  constructor() {
    // Shared public bucket for Wizard Duel registry
    this.bucketId = 'T9xVz2Jq6mD5sY7W4kP8b';
    this.baseUrl = `https://kvdb.io/${this.bucketId}`;
    this.currentUser = null;
    this.localRegistryKey = 'wizard_duel_local_users';
    
    // In-memory defaults
    this.defaultProfile = {
      coins: 0,
      level: 1,
      exp: 0,
      winsBot: 0,
      winsPlayer: 0,
      difficultyWins: { easy: 0, medium: 0, hard: 0, impossible: 0 },
      wizardLevels: { fire: 1, ice: 1, lightning: 1, earth: 1, water: 1, wind: 1, necromancer: 1 }
    };

    this.initLocalRegistry();
  }

  // Basic SHA-256 hash using Web Crypto API
  async hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  initLocalRegistry() {
    if (!localStorage.getItem(this.localRegistryKey)) {
      localStorage.setItem(this.localRegistryKey, JSON.stringify({}));
    }
  }

  // Get user from local storage (offline database)
  getLocalUser(username) {
    const registry = JSON.parse(localStorage.getItem(this.localRegistryKey));
    return registry[username.toLowerCase()];
  }

  // Save user to local storage
  saveLocalUser(username, userData) {
    const registry = JSON.parse(localStorage.getItem(this.localRegistryKey));
    registry[username.toLowerCase()] = userData;
    localStorage.setItem(this.localRegistryKey, JSON.stringify(registry));
  }

  // Check if admin credentials match
  isAdmin(username, password) {
    return username.toLowerCase() === '_rebelsoulz' && password === 'SkillIssue123';
  }

  // Create admin profile
  getAdminProfile() {
    return {
      username: '_rebelsoulz',
      coins: 999999,
      level: 100,
      exp: 0,
      winsBot: 999,
      winsPlayer: 999,
      difficultyWins: { easy: 99, medium: 99, hard: 99, impossible: 99 },
      wizardLevels: { fire: 7, ice: 7, lightning: 7, earth: 7, water: 7, wind: 7, necromancer: 7 }
    };
  }

  // Register user
  async register(username, password) {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters.');
    }
    if (password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

    if (cleanUsername === '_rebelsoulz') {
      throw new Error('Admin username is reserved.');
    }

    const passwordHash = await this.hashPassword(password);
    
    // Check locally first
    if (this.getLocalUser(cleanUsername)) {
      throw new Error('Username is already taken locally.');
    }

    // Try online check
    let onlineUserExists = false;
    try {
      const response = await fetch(`${this.baseUrl}/user_${cleanUsername}`);
      if (response.ok) {
        onlineUserExists = true;
      }
    } catch (e) {
      console.warn('Network offline, registration relying on local database.');
    }

    if (onlineUserExists) {
      throw new Error('Username is already taken online.');
    }

    const newProfile = {
      username: username.trim(),
      passwordHash: passwordHash,
      ...JSON.parse(JSON.stringify(this.defaultProfile))
    };

    // Save locally
    this.saveLocalUser(cleanUsername, newProfile);

    // Save online
    try {
      await fetch(`${this.baseUrl}/user_${cleanUsername}`, {
        method: 'POST',
        body: JSON.stringify(newProfile),
        headers: { 'Content-Type': 'application/json' }
      });
      // Also register username on leaderboard
      this.updateLeaderboardEntry(newProfile);
    } catch (e) {
      console.warn('Failed to upload registration online, stored locally.', e);
    }

    this.currentUser = newProfile;
    return newProfile;
  }

  // Login user
  async login(username, password) {
    const cleanUsername = username.trim().toLowerCase();
    
    // Check if Admin
    if (this.isAdmin(username, password)) {
      this.currentUser = this.getAdminProfile();
      return this.currentUser;
    }

    const passwordHash = await this.hashPassword(password);

    // Try online login first
    try {
      const response = await fetch(`${this.baseUrl}/user_${cleanUsername}`);
      if (response.ok) {
        const profile = await response.json();
        if (profile.passwordHash === passwordHash) {
          this.currentUser = profile;
          this.saveLocalUser(cleanUsername, profile); // keep local in sync
          return profile;
        } else {
          throw new Error('Invalid password.');
        }
      }
    } catch (e) {
      console.warn('Online login failed or offline. Checking local database...', e);
      if (e.message === 'Invalid password.') throw e;
    }

    // Fallback to local login
    const localUser = this.getLocalUser(cleanUsername);
    if (!localUser) {
      throw new Error('User not found.');
    }
    if (localUser.passwordHash !== passwordHash) {
      throw new Error('Invalid password.');
    }

    this.currentUser = localUser;
    return localUser;
  }

  // Save current profile changes
  async saveProfile() {
    if (!this.currentUser) return;
    const cleanUsername = this.currentUser.username.toLowerCase();
    
    // Admin profile doesn't need persistence
    if (cleanUsername === '_rebelsoulz') return;

    // Save local
    this.saveLocalUser(cleanUsername, this.currentUser);

    // Try online save
    try {
      await fetch(`${this.baseUrl}/user_${cleanUsername}`, {
        method: 'POST',
        body: JSON.stringify(this.currentUser),
        headers: { 'Content-Type': 'application/json' }
      });
      
      this.updateLeaderboardEntry(this.currentUser);
    } catch (e) {
      console.error('Failed to sync profile online.', e);
    }
  }

  // Update leaderboard online
  async updateLeaderboardEntry(profile) {
    try {
      const entry = {
        username: profile.username,
        level: profile.level,
        wins: profile.winsBot + profile.winsPlayer,
        coins: profile.coins
      };
      
      await fetch(`${this.baseUrl}/lb_${profile.username.toLowerCase()}`, {
        method: 'POST',
        body: JSON.stringify(entry),
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.warn('Failed to update leaderboard entry.', e);
    }
  }

  // Get leaderboard
  async getLeaderboard() {
    // Generate admin entry
    const adminEntry = {
      username: '_rebelsoulz',
      level: 100,
      wins: 1998,
      coins: 999999
    };

    let entries = [adminEntry];

    try {
      // List all leaderboard keys
      const response = await fetch(`${this.baseUrl}/?prefix=lb_`);
      if (response.ok) {
        const text = await response.text();
        const keys = text.split('\n').filter(k => k.trim());
        
        // Fetch value for each key concurrently
        const fetchPromises = keys.map(async (key) => {
          const res = await fetch(`${this.baseUrl}/${key}`);
          if (res.ok) {
            const data = await res.json();
            if (data.username !== '_rebelsoulz') {
              entries.push(data);
            }
          }
        });
        
        await Promise.all(fetchPromises);
      }
    } catch (e) {
      console.warn('Could not fetch online leaderboard. Using local registry...', e);
      // Construct leaderboard from local storage
      const registry = JSON.parse(localStorage.getItem(this.localRegistryKey));
      Object.values(registry).forEach(user => {
        if (user.username !== '_rebelsoulz') {
          entries.push({
            username: user.username,
            level: user.level,
            wins: user.winsBot + user.winsPlayer,
            coins: user.coins
          });
        }
      });
    }

    // Sort by wins (descending), then level, then coins
    return entries.sort((a, b) => b.wins - a.wins || b.level - a.level || b.coins - a.coins).slice(0, 10);
  }
}

window.dbManager = new DatabaseManager();
