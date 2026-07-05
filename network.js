/**
 * Spellcasters' Arena: PeerJS P2P Networking Layer
 */

class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.myId = '';
    this.opponentId = '';
    this.isConnected = false;
    
    // Callbacks to hook into game loop
    this.onConnectedCallbacks = [];
    this.onDataCallbacks = [];
    this.onDisconnectedCallbacks = [];
    
    // Ping metrics
    this.pingStartTime = 0;
    this.pingInterval = null;
    this.latency = 0;

    this.initElements();
    this.bindEvents();
    this.initPeer();
  }

  initElements() {
    this.btnHost = document.getElementById('btn-host');
    this.btnJoin = document.getElementById('btn-join');
    this.joinInput = document.getElementById('join-id-input');
    
    this.modeSelection = document.getElementById('mode-selection');
    this.p2pActions = document.getElementById('p2p-actions');
    this.hostStatus = document.getElementById('host-status');
    this.lobbyCode = document.getElementById('lobby-code');
    this.btnCopyCode = document.getElementById('btn-copy-code');
    this.btnCancelHost = document.getElementById('btn-cancel-host');
    
    this.connectStatus = document.getElementById('connect-status');
    this.connectStatusText = document.getElementById('connect-status-text');
    this.btnCancelConnect = document.getElementById('btn-cancel-connect');

    this.btnDisconnect = document.getElementById('btn-disconnect');
    this.pingText = document.getElementById('ping-text');
    
    this.nameInput = document.getElementById('player-name');
    this.colorButtons = document.querySelectorAll('.color-btn');
    this.elementButtons = document.querySelectorAll('.element-btn');
    
    // Set default name if empty
    if (!this.nameInput.value) {
      const names = ['Merlin', 'Gandalf', 'Jaina', 'Voldemort', 'Dr. Strange', 'Morgana', 'Alatar', 'Harry'];
      this.nameInput.value = names[Math.floor(Math.random() * names.length)];
    }
  }

  bindEvents() {
    // Mode transitions
    document.getElementById('btn-mode-player').addEventListener('click', () => {
      this.modeSelection.classList.add('hidden');
      this.p2pActions.classList.remove('hidden');
    });
    
    document.getElementById('btn-p2p-back').addEventListener('click', () => {
      this.modeSelection.classList.remove('hidden');
      this.p2pActions.classList.add('hidden');
    });

    document.getElementById('btn-mode-bot').addEventListener('click', () => {
      if (window.gameEngine) {
        window.gameEngine.startBotMode();
      }
    });

    // Host action
    this.btnHost.addEventListener('click', () => this.startHosting());
    this.btnCancelHost.addEventListener('click', () => this.stopHosting());
    
    // Join action
    this.btnJoin.addEventListener('click', () => {
      const targetId = this.joinInput.value.trim();
      if (targetId) this.connectToPeer(targetId);
    });
    this.btnCancelConnect.addEventListener('click', () => this.disconnect());

    // Disconnect in-game
    this.btnDisconnect.addEventListener('click', () => this.disconnect());
    
    // Copy invite link
    this.btnCopyCode.addEventListener('click', () => this.copyInviteLink());

    // Customization selections
    this.colorButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.colorButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.saveCustomization();
      });
    });

    this.elementButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.elementButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.saveCustomization();
      });
    });
  }

  initPeer() {
    // Initialize PeerJS
    this.peer = new Peer({
      debug: 1
    });

    this.peer.on('open', (id) => {
      this.myId = id;
      console.log('PeerJS server connected. My ID is: ' + id);
      
      // Auto-join from URL parameter if present
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        // Auto-switch to p2p panel
        this.modeSelection.classList.add('hidden');
        this.p2pActions.classList.remove('hidden');
        this.joinInput.value = roomParam;
        this.connectStatusText.textContent = `Auto-joining duel ${roomParam}...`;
        this.connectToPeer(roomParam);
      }
    });

    this.peer.on('connection', (conn) => {
      if (this.isConnected) {
        conn.on('open', () => {
          conn.send({ type: 'lobby_full' });
          setTimeout(() => conn.close(), 500);
        });
        return;
      }
      this.isHost = true;
      this.conn = conn;
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS error: ', err);
      // Fail silently or notify on strict networks
      this.disconnect();
    });
  }

  // --- Actions ---

  startHosting() {
    if (!this.myId) {
      alert('Not connected to matchmaking server yet. Please wait a moment.');
      return;
    }
    this.isHost = true;
    this.p2pActions.classList.add('hidden');
    this.hostStatus.classList.remove('hidden');
    this.lobbyCode.textContent = this.myId;
  }

  stopHosting() {
    this.isHost = false;
    this.p2pActions.classList.remove('hidden');
    this.hostStatus.classList.add('hidden');
  }

  connectToPeer(targetId) {
    this.isHost = false;
    this.p2pActions.classList.add('hidden');
    this.connectStatus.classList.remove('hidden');
    this.connectStatusText.textContent = `Finding Spellcaster ${targetId}...`;

    // Connect using default PeerJS settings (allows TCP fallback for network reliability)
    this.conn = this.peer.connect(targetId);

    this.setupConnection();
  }

  setupConnection() {
    this.conn.on('open', () => {
      this.isConnected = true;
      this.opponentId = this.conn.peer;
      console.log('Connection established with ' + this.opponentId);
      
      this.hostStatus.classList.add('hidden');
      this.connectStatus.classList.add('hidden');
      
      window.history.replaceState({}, document.title, window.location.pathname);

      const config = this.getCustomization();
      this.send('handshake', config);

      this.startLatencyPinger();

      this.onConnectedCallbacks.forEach(cb => cb());
    });

    this.conn.on('data', (data) => {
      if (data.type === 'ping') {
        this.send('pong');
        return;
      }
      if (data.type === 'pong') {
        this.latency = Date.now() - this.pingStartTime;
        this.pingText.textContent = `Ping: ${this.latency} ms`;
        return;
      }
      
      this.onDataCallbacks.forEach(cb => cb(data));
    });

    this.conn.on('close', () => {
      this.handleDisconnect();
    });

    this.conn.on('error', (err) => {
      console.error('Connection error:', err);
      this.handleDisconnect();
    });
  }

  send(type, payload = {}) {
    if (this.conn && this.isConnected) {
      this.conn.send({ type, ...payload });
    }
  }

  disconnect() {
    if (this.conn) {
      this.conn.close();
    }
    this.handleDisconnect();
  }

  handleDisconnect() {
    this.isConnected = false;
    this.isHost = false;
    this.conn = null;
    
    clearInterval(this.pingInterval);
    this.pingText.textContent = `Ping: -- ms`;
    
    this.modeSelection.classList.remove('hidden');
    this.p2pActions.classList.add('hidden');
    this.hostStatus.classList.add('hidden');
    this.connectStatus.classList.add('hidden');
    
    this.onDisconnectedCallbacks.forEach(cb => cb());
  }

  // --- Latency (Ping) ---
  
  startLatencyPinger() {
    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.pingStartTime = Date.now();
      this.send('ping');
    }, 1500);
  }

  initElements() {
    this.btnHost = document.getElementById('btn-host');
    this.btnJoin = document.getElementById('btn-join');
    this.joinInput = document.getElementById('join-id-input');
    
    this.modeSelection = document.getElementById('mode-selection');
    this.p2pActions = document.getElementById('p2p-actions');
    this.hostStatus = document.getElementById('host-status');
    this.lobbyCode = document.getElementById('lobby-code');
    this.btnCopyCode = document.getElementById('btn-copy-code');
    this.btnCancelHost = document.getElementById('btn-cancel-host');
    
    this.connectStatus = document.getElementById('connect-status');
    this.connectStatusText = document.getElementById('connect-status-text');
    this.btnCancelConnect = document.getElementById('btn-cancel-connect');

    this.btnDisconnect = document.getElementById('btn-disconnect');
    this.pingText = document.getElementById('ping-text');
    
    this.colorButtons = document.querySelectorAll('.color-btn');
    this.elementButtons = document.querySelectorAll('.element-btn');
  }

  // --- Player Settings Getter/Setter ---

  getCustomization() {
    const activeColorBtn = document.querySelector('.color-btn.active');
    const activeElementBtn = document.querySelector('.element-btn.active');
    const durationSelect = document.getElementById('match-duration');
    const mapSelect = document.getElementById('map-selector');
    
    const element = activeElementBtn ? activeElementBtn.getAttribute('data-element') : 'fire';
    const name = window.dbManager.currentUser ? window.dbManager.currentUser.username : 'Spellcaster';
    
    let wizardLevel = 1;
    if (window.dbManager.currentUser && window.dbManager.currentUser.wizardLevels) {
      wizardLevel = window.dbManager.currentUser.wizardLevels[element] || 1;
    }

    return {
      name: name,
      color: activeColorBtn ? activeColorBtn.getAttribute('data-color') : '#00f3ff',
      element: element,
      matchDuration: durationSelect ? parseInt(durationSelect.value) : 90,
      map: mapSelect ? mapSelect.value : 'random',
      wizardLevel: wizardLevel
    };
  }

  saveCustomization() {
    const config = this.getCustomization();
    localStorage.setItem('wizard_duel_customization', JSON.stringify({
      color: config.color,
      element: config.element,
      matchDuration: config.matchDuration,
      map: config.map
    }));
  }

  loadCustomization() {
    try {
      const data = localStorage.getItem('wizard_duel_customization');
      if (data) {
        const config = JSON.parse(data);
        
        if (config.color) {
          this.colorButtons.forEach(btn => {
            if (btn.getAttribute('data-color') === config.color) {
              this.colorButtons.forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
            }
          });
        }

        if (config.element) {
          // Find the parent class-card and select it
          const elementBtn = document.querySelector(`.element-btn[data-element="${config.element}"]`);
          if (elementBtn) {
            this.elementButtons.forEach(b => b.classList.remove('active'));
            elementBtn.classList.add('active');
            document.querySelectorAll('.class-card').forEach(card => card.classList.remove('active'));
            elementBtn.closest('.class-card').classList.add('active');
          }
        }

        if (config.matchDuration) {
          const durationSelect = document.getElementById('match-duration');
          if (durationSelect) durationSelect.value = config.matchDuration;
        }

        if (config.map) {
          const mapSelect = document.getElementById('map-selector');
          if (mapSelect) mapSelect.value = config.map;
        }
      }
    } catch (e) {
      console.warn('Could not load wizard customization.', e);
    }
  }

  copyInviteLink() {
    if (!this.myId) return;
    const link = `${window.location.origin}${window.location.pathname}?room=${this.myId}`;
    
    navigator.clipboard.writeText(link).then(() => {
      const oldText = this.btnCopyCode.textContent;
      this.btnCopyCode.textContent = '✓';
      setTimeout(() => this.btnCopyCode.textContent = oldText, 1500);
    }).catch(err => {
      console.error('Could not copy invite link: ', err);
      // Fallback: alert
      alert('Invite Link: ' + link);
    });
  }

  // --- Registration Hook methods ---

  registerOnConnected(cb) { this.onConnectedCallbacks.push(cb); }
  registerOnData(cb) { this.onDataCallbacks.push(cb); }
  registerOnDisconnected(cb) { this.onDisconnectedCallbacks.push(cb); }
}

// Instantiate globally
window.networkManager = new NetworkManager();
window.networkManager.loadCustomization();
