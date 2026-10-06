import { GunClientManager } from './gun-client';
import { IPFSClientManager } from './ipfs-client';
import { PeerDiscoveryManager } from './peer-discovery';
import { DataSyncManager } from './data-sync';
import { generateDID } from '../identity/did-manager';

describe('P2P Module Tests', () => {
  describe('GunClientManager', () => {
    let gunClient: GunClientManager;

    beforeEach(() => {
      gunClient = new GunClientManager({
        peers: ['http://localhost:8765/gun'],
        debug: false,
      });
    });

    afterEach(() => {
      gunClient.close();
    });

    it('should initialize Gun client', () => {
      expect(gunClient).toBeDefined();
    });

    it('should store and retrieve data', async () => {
      const testData = { name: 'Alice', score: 85 };

      await gunClient.put('users/alice', testData);
      const retrieved = await gunClient.get('users/alice');

      expect(retrieved).toEqual(testData);
    });

    it('should subscribe to data changes', async () => {
      const testData = { name: 'Bob', score: 90 };

      await new Promise<void>((resolve, reject) => {
        const unsubscribe = gunClient.subscribe('users/bob', (data) => {
          expect(data).toEqual(testData);
          unsubscribe();
          resolve();
        });

        gunClient.put('users/bob', testData).catch(reject);
      });
    });

    it('should delete data', async () => {
      const testData = { name: 'Charlie', score: 75 };

      await gunClient.put('users/charlie', testData);
      await gunClient.delete('users/charlie');
      const retrieved = await gunClient.get('users/charlie');

      expect(retrieved).toBeNull();
    });

    it('should list keys', async () => {
      await gunClient.put('users/alice', { name: 'Alice' });
      await gunClient.put('users/bob', { name: 'Bob' });

      const keys = await gunClient.keys('users');

      expect(keys).toContain('alice');
      expect(keys).toContain('bob');
    });

    it('should search data', async () => {
      await gunClient.put('users/alice', { name: 'Alice', score: 85 });
      await gunClient.put('users/bob', { name: 'Bob', score: 90 });
      await gunClient.put('users/charlie', { name: 'Charlie', score: 75 });

      const results = await gunClient.search('users', (item) => (item as { score: number }).score > 80);

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should get network stats', () => {
      const stats = gunClient.getNetworkStats();

      expect(stats).toHaveProperty('peers');
      expect(stats).toHaveProperty('connected');
      expect(stats).toHaveProperty('uptime');
    });
  });

  describe('IPFSClientManager', () => {
    let ipfsClient: IPFSClientManager;

    beforeEach(() => {
      ipfsClient = new IPFSClientManager({
        apiUrl: 'http://localhost:5001',
        debug: false,
      });
    });

    afterEach(async () => {
      await ipfsClient.close();
    });

    it('should initialize IPFS client', () => {
      expect(ipfsClient).toBeDefined();
    });

    it('should upload and retrieve file', async () => {
      const fileContent = Buffer.from('Test file content');
      const fileName = 'test.txt';
      const userDID = 'did:key:test';

      const uploadResult = await ipfsClient.uploadFile(
        fileContent,
        fileName,
        userDID
      );

      expect(uploadResult).toHaveProperty('cid');
      expect(uploadResult.name).toBe(fileName);
      expect(uploadResult.size).toBe(fileContent.length);

      const retrieved = await ipfsClient.getFile(uploadResult.cid);

      expect(retrieved).toEqual(fileContent);
    });

    it('should upload directory', async () => {
      const files = [
        { name: 'file1.txt', content: Buffer.from('Content 1') },
        { name: 'file2.txt', content: Buffer.from('Content 2') },
      ];
      const userDID = 'did:key:test';

      const results = await ipfsClient.uploadDirectory(files, userDID);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('cid');
      expect(results[1]).toHaveProperty('cid');
    });

    it('should get gateway URL', async () => {
      const fileContent = Buffer.from('Test content');
      const uploadResult = await ipfsClient.uploadFile(
        fileContent,
        'test.txt',
        'did:key:test'
      );

      const gatewayUrl = ipfsClient.getGatewayUrl(uploadResult.cid);

      expect(gatewayUrl).toContain(uploadResult.cid);
      expect(gatewayUrl).toContain('/ipfs/');
    });

    it('should pin and unpin files', async () => {
      const fileContent = Buffer.from('Test content');
      const uploadResult = await ipfsClient.uploadFile(
        fileContent,
        'test.txt',
        'did:key:test'
      );

      await ipfsClient.pinFile(uploadResult.cid);
      const pinnedFiles = await ipfsClient.getPinnedFiles();

      expect(pinnedFiles).toContain(uploadResult.cid);

      await ipfsClient.unpinFile(uploadResult.cid);
    });
  });

  describe('PeerDiscoveryManager', () => {
    let peerDiscovery: PeerDiscoveryManager;

    beforeEach(() => {
      peerDiscovery = new PeerDiscoveryManager({
        enableMDNS: false,
        enableDHT: false,
        debug: false,
      });
    });

    afterEach(() => {
      peerDiscovery.stopDiscovery();
    });

    it('should initialize peer discovery', () => {
      expect(peerDiscovery).toBeDefined();
    });

    it('should add peer', () => {
      const peerInfo = {
        id: 'peer-1',
        addresses: ['http://localhost:8765'],
        lastSeen: Date.now(),
        reputation: 50,
        type: 'gun' as const,
      };

      peerDiscovery.addPeer(peerInfo);
      const peers = peerDiscovery.getPeers();

      expect(peers).toContainEqual(peerInfo);
    });

    it('should update peer reputation', () => {
      const peerInfo = {
        id: 'peer-1',
        addresses: ['http://localhost:8765'],
        lastSeen: Date.now(),
        reputation: 50,
        type: 'gun' as const,
      };

      peerDiscovery.addPeer(peerInfo);
      peerDiscovery.updatePeerReputation('peer-1', 10);

      const peer = peerDiscovery.getPeer('peer-1');
      expect(peer?.reputation).toBe(60);
    });

    it('should get trusted peers', () => {
      const peer1 = {
        id: 'peer-1',
        addresses: ['http://localhost:8765'],
        lastSeen: Date.now(),
        reputation: 50,
        type: 'gun' as const,
      };

      const peer2 = {
        id: 'peer-2',
        addresses: ['http://localhost:8766'],
        lastSeen: Date.now(),
        reputation: 10,
        type: 'gun' as const,
      };

      peerDiscovery.addPeer(peer1);
      peerDiscovery.addPeer(peer2);

      const trustedPeers = peerDiscovery.getTrustedPeers();

      expect(trustedPeers).toContainEqual(peer1);
      expect(trustedPeers).not.toContainEqual(peer2);
    });

    it('should get network stats', () => {
      const peerInfo = {
        id: 'peer-1',
        addresses: ['http://localhost:8765'],
        lastSeen: Date.now(),
        reputation: 50,
        type: 'gun' as const,
      };

      peerDiscovery.addPeer(peerInfo);
      const stats = peerDiscovery.getNetworkStats();

      expect(stats).toHaveProperty('totalPeers');
      expect(stats).toHaveProperty('trustedPeers');
      expect(stats).toHaveProperty('averageReputation');
      expect(stats.totalPeers).toBeGreaterThan(0);
    });
  });

  describe('DataSyncManager', () => {
    let dataSync: DataSyncManager;
    let userDID: string;
    let privateKey: Uint8Array;

    beforeEach(() => {
      dataSync = new DataSyncManager({
        autoSync: false,
        debug: false,
      });

      const identity = generateDID();
      userDID = identity.did;
      privateKey = identity.privateKeyPkcs8;
    });

    afterEach(() => {
      dataSync.stopAutoSync();
    });

    it('should initialize data sync', () => {
      expect(dataSync).toBeDefined();
    });

    it('should queue profile sync', async () => {
      const profileData = { name: 'Alice', score: 85 };

      await dataSync.syncProfile(userDID, profileData, privateKey);
      const status = dataSync.getSyncStatus();

      expect(status.queueLength).toBeGreaterThan(0);
    });

    it('should queue proposal sync', async () => {
      const proposalData = {
        title: 'Test Proposal',
        description: 'A test proposal',
      };

      await dataSync.syncProposal(
        'proposal-1',
        proposalData,
        userDID,
        privateKey
      );

      const status = dataSync.getSyncStatus();
      expect(status.queueLength).toBeGreaterThan(0);
    });

    it('should queue endorsement sync', async () => {
      const endorsementData = {
        targetDID: 'did:key:target',
        pillar: 'education',
        stars: 5,
      };

      await dataSync.syncEndorsement(
        'endorsement-1',
        endorsementData,
        userDID,
        privateKey
      );

      const status = dataSync.getSyncStatus();
      expect(status.queueLength).toBeGreaterThan(0);
    });

    it('should queue vote sync', async () => {
      const voteData = {
        proposalId: 'proposal-1',
        choice: 'yes',
      };

      await dataSync.syncVote('vote-1', voteData, userDID, privateKey);

      const status = dataSync.getSyncStatus();
      expect(status.queueLength).toBeGreaterThan(0);
    });

    it('should get sync status', () => {
      const status = dataSync.getSyncStatus();

      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('isAutoSyncing');
    });
  });
});
