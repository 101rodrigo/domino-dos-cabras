import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, LogOut, User, Trophy, Zap, Flame, Ghost, Smile, Laugh, Copy, Check, Info, Settings, ShieldAlert, Award, Star, Compass, Users } from 'lucide-react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  arrayUnion, 
  runTransaction,
  getDocs
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

export default function DominoDasCabras() {
  // ==========================================
  // ESTADOS PRINCIPAIS E MOCKS LOCAIS (FALLBACK)
  // ==========================================
  const [useLocalDemo, setUseLocalDemo] = useState(!isFirebaseConfigured);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Lista de usuários para o modo Offline Demo
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('domino_users');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, username: 'CabraLoka', password: '123', profilePic: '🤠', leaguePoints: 150, champion: true, wins: 15 },
      { id: 2, username: 'VinhedoPapeiro', password: '123', profilePic: '🍷', leaguePoints: 120, champion: false, wins: 12 },
      { id: 3, username: 'SertanejoTop', password: '123', profilePic: '🎸', leaguePoints: 110, champion: false, wins: 11 },
      { id: 4, username: 'DominoMaster', password: '123', profilePic: '🎯', leaguePoints: 100, champion: false, wins: 10 },
    ];
  });

  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [screen, setScreen] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '', profilePic: '🐐' });
  const [gameState, setGameState] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [waitingForMatch, setWaitingForMatch] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const chatEndRef = useRef(null);

  // Estados extras para a tela de Setup do Firebase
  const [copiedText, setCopiedText] = useState(false);
  
  // ID da partida no Firebase
  const [activeMatchId, setActiveMatchId] = useState(null);
  // Leaderboard em tempo real
  const [realtimeLeaderboard, setRealtimeLeaderboard] = useState([]);

  const profilePicOptions = ['🐐', '🤠', '🍺', '🎸', '🔥', '⭐', '💎', '🏆', '🎭', '🌟'];
  const emotes = [
    { id: 'laugh', emoji: '😂', label: 'Risada' },
    { id: 'wow', emoji: '😮', label: 'Wow' },
    { id: 'fire', emoji: '🔥', label: 'Fogo' },
    { id: 'thinking', emoji: '🤔', label: 'Pensando' },
    { id: 'skull', emoji: '💀', label: 'Morto' },
    { id: 'clap', emoji: '👏', label: 'Aplauso' },
  ];

  // Auto-scroll no chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ==========================================
  // 1. SISTEMA DE PRESENÇA (ONLINE HEARTBEAT)
  // ==========================================
  useEffect(() => {
    if (useLocalDemo) {
      // Simulação antiga do modo Demo
      const interval = setInterval(() => {
        if (!gameState) {
          setOnlinePlayers(users.filter(u => u.id !== currentUser?.id && Math.random() > 0.3).slice(0, 3));
        }
      }, 3000);
      return () => clearInterval(interval);
    } else {
      // Modo Real-time Firebase
      if (!currentUser || screen === 'login') return;

      const userStatusRef = doc(db, 'online_players', currentUser.username.toLowerCase());
      
      // Envia heartbeat imediatamente
      const sendHeartbeat = async () => {
        try {
          await setDoc(userStatusRef, {
            userId: currentUser.id || currentUser.username,
            username: currentUser.username,
            profilePic: currentUser.profilePic,
            leaguePoints: currentUser.leaguePoints || 0,
            wins: currentUser.wins || 0,
            lastActive: Date.now()
          });
        } catch (e) {
          console.error("Erro ao enviar presença:", e);
        }
      };

      sendHeartbeat();
      const heartbeatInterval = setInterval(sendHeartbeat, 8000);

      // Escuta lista de jogadores online em tempo real
      const q = query(collection(db, 'online_players'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const now = Date.now();
        const players = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Remove jogadores inativos por mais de 24 segundos e a si mesmo
          if (now - data.lastActive < 24000 && data.username.toLowerCase() !== currentUser.username.toLowerCase()) {
            players.push(data);
          }
        });
        setOnlinePlayers(players);
      });

      // Remove presença ao deslogar ou fechar aba
      return () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        deleteDoc(userStatusRef).catch(console.error);
      };
    }
  }, [useLocalDemo, currentUser, screen, gameState, users]);

  // ==========================================
  // 2. LEADERBOARD EM TEMPO REAL (FIREBASE)
  // ==========================================
  useEffect(() => {
    if (useLocalDemo) {
      // Ordenação local do mock
      const sorted = [...users].sort((a, b) => b.leaguePoints - a.leaguePoints);
      setRealtimeLeaderboard(sorted);
    } else {
      if (screen === 'login') return;
      // Escuta as atualizações de usuários do Firestore em tempo real
      const q = query(collection(db, 'users'), orderBy('leaguePoints', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push(doc.data());
        });
        setRealtimeLeaderboard(list);
      });
      return () => unsubscribe();
    }
  }, [useLocalDemo, screen, users]);

  // ==========================================
  // 3. LOGOUT & CONFIGURAÇÃO
  // ==========================================
  const handleLogout = async () => {
    if (!useLocalDemo && currentUser) {
      try {
        const userStatusRef = doc(db, 'online_players', currentUser.username.toLowerCase());
        await deleteDoc(userStatusRef);
      } catch (e) {
        console.error(e);
      }
    }
    
    // Cancela qualquer partida ativa
    if (activeMatchId && !useLocalDemo) {
      setActiveMatchId(null);
    }

    setCurrentUser(null);
    setScreen('login');
    setGameState(null);
    setChatMessages([]);
    setLoginForm({ username: '', password: '' });
  };

  // ==========================================
  // 4. AUTENTICAÇÃO (LOGIN & REGISTRO)
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanUsername = loginForm.username.trim();
    if (!cleanUsername || !loginForm.password) return;

    if (useLocalDemo) {
      // Modo Demo
      const user = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.password === loginForm.password);
      if (user) {
        setCurrentUser(user);
        setScreen('home');
        setLoginForm({ username: '', password: '' });
      } else {
        alert('Usuário ou senha incorretos! (Modo Demo)');
      }
    } else {
      // Modo Firebase Real-time
      try {
        const userRef = doc(db, 'users', cleanUsername.toLowerCase());
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.password === loginForm.password) {
            setCurrentUser(userData);
            setScreen('home');
            setLoginForm({ username: '', password: '' });
          } else {
            alert('Senha incorreta!');
          }
        } else {
          alert('Usuário não encontrado! Crie uma conta primeiro.');
        }
      } catch (error) {
        console.error(error);
        alert('Erro ao conectar ao banco de dados: ' + error.message);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const cleanUsername = registerForm.username.trim();

    if (registerForm.password !== registerForm.confirmPassword) {
      alert('Senhas não conferem!');
      return;
    }
    if (!cleanUsername) return;

    if (useLocalDemo) {
      // Registro no Modo Demo
      const exists = users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
      if (exists) {
        alert('Este username já existe!');
        return;
      }
      const newUser = {
        id: Math.max(...users.map(u => u.id), 0) + 1,
        username: cleanUsername,
        password: registerForm.password,
        profilePic: registerForm.profilePic,
        leaguePoints: 0,
        champion: false,
        wins: 0,
      };
      const newUsers = [...users, newUser];
      setUsers(newUsers);
      localStorage.setItem('domino_users', JSON.stringify(newUsers));
      setCurrentUser(newUser);
      setScreen('home');
      setRegisterForm({ username: '', password: '', confirmPassword: '', profilePic: '🐐' });
    } else {
      // Registro no Firebase Firestore
      try {
        const userRef = doc(db, 'users', cleanUsername.toLowerCase());
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          alert('Este nome de usuário já está cadastrado!');
          return;
        }

        const newUser = {
          id: cleanUsername.toLowerCase(),
          username: cleanUsername,
          password: registerForm.password,
          profilePic: registerForm.profilePic,
          leaguePoints: 0,
          champion: false,
          wins: 0,
          createdAt: Date.now()
        };

        await setDoc(userRef, newUser);
        setCurrentUser(newUser);
        setScreen('home');
        setRegisterForm({ username: '', password: '', confirmPassword: '', profilePic: '🐐' });
      } catch (error) {
        console.error(error);
        alert('Erro ao criar conta no banco: ' + error.message);
      }
    }
  };

  // ==========================================
  // 5. ATUALIZAR PERFIL
  // ==========================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const updatedFields = {
      ...editForm,
    };
    
    if (useLocalDemo) {
      const updated = {
        ...currentUser,
        ...updatedFields,
      };
      const updatedUsers = users.map(u => u.id === currentUser.id ? updated : u);
      setUsers(updatedUsers);
      localStorage.setItem('domino_users', JSON.stringify(updatedUsers));
      setCurrentUser(updated);
      setEditProfile(false);
      setEditForm({});
    } else {
      try {
        const userRef = doc(db, 'users', currentUser.username.toLowerCase());
        const updated = {
          ...currentUser,
          ...updatedFields,
        };
        await updateDoc(userRef, updatedFields);
        
        // Também atualiza o status de online se houver
        const userStatusRef = doc(db, 'online_players', currentUser.username.toLowerCase());
        await updateDoc(userStatusRef, {
          username: updated.username,
          profilePic: updated.profilePic
        }).catch(() => {});

        setCurrentUser(updated);
        setEditProfile(false);
        setEditForm({});
      } catch (error) {
        console.error(error);
        alert('Erro ao atualizar perfil no Firestore: ' + error.message);
      }
    }
  };

  // ==========================================
  // 6. REAL-TIME MATCHMAKING & LOBBY
  // ==========================================
  const handleStartMatchmaking = async () => {
    setWaitingForMatch(true);

    if (useLocalDemo) {
      // Simulação offline de matchmaking
      setTimeout(() => {
        const partner = onlinePlayers.length > 0 
          ? onlinePlayers[Math.floor(Math.random() * onlinePlayers.length)]
          : { id: 99, username: 'CabraMestra', profilePic: '⭐' };
        
        const opponent1 = users[Math.floor(Math.random() * users.length)];
        const opponent2 = users[Math.floor(Math.random() * users.length)];
        
        setGameState({
          playerId: currentUser.id,
          playerName: currentUser.username,
          partnerId: partner.id || partner.username,
          partnerName: partner.username,
          opponent1Id: opponent1.id,
          opponent1Name: opponent1.username,
          opponent2Id: opponent2.id,
          opponent2Name: opponent2.username,
          score: { team1: 0, team2: 0 },
          round: 1,
        });
        setChatMessages([{ type: 'system', text: `Partida iniciada! Você está jogando com ${partner.username}` }]);
        setWaitingForMatch(false);
        setScreen('game');
      }, 2000);
    } else {
      // Matchmaking Real-time online usando Firestore
      try {
        // 1. Procurar uma partida disponível com status "waiting"
        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, where('status', '==', 'waiting'), orderBy('createdAt', 'asc'), limit(1));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          // Encontramos uma sala esperando! Entramos nela como Parceiro (Parceiro Humano Real-time!)
          const matchDoc = querySnap.docs[0];
          const matchRef = doc(db, 'matches', matchDoc.id);

          await updateDoc(matchRef, {
            partnerId: currentUser.username.toLowerCase(),
            partnerName: currentUser.username,
            partnerProfilePic: currentUser.profilePic,
            status: 'active', // A partida inicia agora que a dupla está completa!
            updatedAt: Date.now()
          });

          setActiveMatchId(matchDoc.id);
        } else {
          // Não há salas vazias. Criamos uma nova e esperamos outro jogador entrar!
          const newMatchRef = doc(collection(db, 'matches'));
          const newMatch = {
            id: newMatchRef.id,
            status: 'waiting',
            creatorId: currentUser.username.toLowerCase(),
            playerId: currentUser.username.toLowerCase(),
            playerName: currentUser.username,
            playerProfilePic: currentUser.profilePic,
            partnerId: null,
            partnerName: 'Aguardando Parceiro...',
            partnerProfilePic: '🐐',
            // Preenchemos os adversários com bots divertidos para garantir partida rápida
            opponent1Name: 'VinhedoPapeiro',
            opponent2Name: 'SertanejoTop',
            score: { team1: 0, team2: 0 },
            round: 1,
            messages: [{ type: 'system', text: 'Você criou a sala! Aguardando um parceiro real se conectar...' }],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          await setDoc(newMatchRef, newMatch);
          setActiveMatchId(newMatchRef.id);
        }
      } catch (error) {
        console.error(error);
        alert('Erro ao buscar matchmaking: ' + error.message);
        setWaitingForMatch(false);
      }
    }
  };

  // ==========================================
  // 7. ESCUTAR ATUALIZAÇÃO DA PARTIDA ATIVA (FIREBASE)
  // ==========================================
  useEffect(() => {
    if (useLocalDemo || !activeMatchId) return;

    const matchRef = doc(db, 'matches', activeMatchId);
    
    // Conexão em tempo real com a sala de jogo ativa
    const unsubscribe = onSnapshot(matchRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Sincroniza o GameState do React
        setGameState({
          matchId: data.id,
          playerId: data.playerId,
          playerName: data.playerName,
          playerProfilePic: data.playerProfilePic,
          partnerId: data.partnerId,
          partnerName: data.partnerName,
          partnerProfilePic: data.partnerProfilePic,
          opponent1Name: data.opponent1Name,
          opponent2Name: data.opponent2Name,
          score: data.score,
          round: data.round,
          status: data.status
        });

        // Sincroniza o Chat de Jogo em Tempo Real!
        if (data.messages) {
          setChatMessages(data.messages);
        }

        // Se a partida mudou para ativa, entra na tela de jogo
        if (data.status === 'active' && screen !== 'game') {
          setWaitingForMatch(false);
          setScreen('game');
        }

        // Se a partida foi cancelada ou encerrada
        if (data.status === 'finished' && screen === 'game') {
          // Mantém
        }
      } else {
        // A sala foi excluída
        setGameState(null);
        setScreen('home');
        setActiveMatchId(null);
        alert("A partida foi encerrada por um dos jogadores.");
      }
    });

    return () => unsubscribe();
  }, [useLocalDemo, activeMatchId]);

  // ==========================================
  // 8. ATUALIZAR PLACAR E CONTROLAR PONTUAÇÃO
  // ==========================================
  const handleScoreUpdate = async (team) => {
    if (useLocalDemo) {
      // Flexibilização Local
      const newScore = { ...gameState.score };
      if (team === 'team1') {
        newScore.team1 += 1;
        setChatMessages(prev => [...prev, { type: 'system', text: `Seu time marcou 1 ponto!` }]);
      } else {
        newScore.team2 += 1;
        setChatMessages(prev => [...prev, { type: 'system', text: `Adversários marcaram 1 ponto!` }]);
      }
      setGameState({ ...gameState, score: newScore });
    } else {
      // Atualização no Firestore (Real-time para ambos os jogadores!)
      try {
        const matchRef = doc(db, 'matches', activeMatchId);
        const newScore = { ...gameState.score };
        let systemText = "";

        if (team === 'team1') {
          newScore.team1 += 1;
          systemText = `🐐 ${currentUser.username} marcou 1 ponto para seu time!`;
        } else {
          newScore.team2 += 1;
          systemText = `💥 Adversários marcaram 1 ponto!`;
        }

        await updateDoc(matchRef, {
          score: newScore,
          messages: arrayUnion({
            type: 'system',
            text: systemText,
            timestamp: Date.now()
          }),
          updatedAt: Date.now()
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleWinGame = async () => {
    if (useLocalDemo) {
      // Vitória Offline
      const updatedUsers = users.map(u => {
        if (u.id === currentUser.id || u.id === gameState.partnerId) {
          const nextPoints = u.leaguePoints + 10;
          return {
            ...u,
            leaguePoints: nextPoints,
            wins: u.wins + 1,
            champion: nextPoints >= 100 ? true : u.champion,
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      localStorage.setItem('domino_users', JSON.stringify(updatedUsers));
      
      const updatedCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
      setCurrentUser(updatedCurrentUser);
      
      setChatMessages(prev => [...prev, { 
        type: 'system', 
        text: `🎉 VITÓRIA! Vocês ganharam 10 pontos para a Cabra's League!` 
      }]);
    } else {
      // Vitória Online em Tempo Real no Firestore usando transação segura!
      try {
        const matchRef = doc(db, 'matches', activeMatchId);
        
        // 1. Atualizar o status da partida para finalizada e enviar mensagem de celebração
        await updateDoc(matchRef, {
          status: 'finished',
          messages: arrayUnion({
            type: 'system',
            text: `🏆 VITÓRIA REAL-TIME! O time dos Cabras venceu a partida! +10 Pontos!`,
            timestamp: Date.now()
          }),
          updatedAt: Date.now()
        });

        // 2. Dar pontos para o jogador atual no Firestore de forma transacional
        const userRef = doc(db, 'users', currentUser.username.toLowerCase());
        
        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) return;
          
          const data = userSnap.data();
          const nextWins = (data.wins || 0) + 1;
          const nextPoints = (data.leaguePoints || 0) + 10;
          const isChamp = nextPoints >= 100 ? true : (data.champion || false);

          transaction.update(userRef, {
            wins: nextWins,
            leaguePoints: nextPoints,
            champion: isChamp
          });

          // Atualiza estado local da sessão do jogador atual
          setCurrentUser(prev => ({
            ...prev,
            wins: nextWins,
            leaguePoints: nextPoints,
            champion: isChamp
          }));
        });

      } catch (error) {
        console.error(error);
        alert("Erro ao computar vitória: " + error.message);
      }
    }
  };

  // ==========================================
  // 9. ENVIAR MENSAGENS E EMOTES
  // ==========================================
  const handleSendMessage = async (e, isEmote = false, emoteChar = '') => {
    if (e) e.preventDefault();
    
    const textToSend = isEmote ? emoteChar : chatInput;
    if (!textToSend.trim()) return;

    const message = {
      author: currentUser.username,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isEmote: isEmote,
    };

    if (useLocalDemo) {
      // Envio Local
      setChatMessages(prev => [...prev, message]);
      setChatInput('');
    } else {
      // Envio Online no Firestore
      try {
        const matchRef = doc(db, 'matches', activeMatchId);
        await updateDoc(matchRef, {
          messages: arrayUnion(message),
          updatedAt: Date.now()
        });
        setChatInput('');
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
      }
    }
  };

  const handleSendEmote = (emoji) => {
    handleSendMessage(null, true, emoji);
  };

  // ==========================================
  // COPIAR CÓDIGO DA TELA DE CONFIGURAÇÃO
  // ==========================================
  const copyEnvCode = () => {
    const envText = `VITE_FIREBASE_API_KEY=INSIRA_SUA_API_KEY_AQUI
VITE_FIREBASE_AUTH_DOMAIN=INSIRA_SEU_AUTH_DOMAIN_AQUI
VITE_FIREBASE_PROJECT_ID=INSIRA_SEU_PROJECT_ID_AQUI
VITE_FIREBASE_STORAGE_BUCKET=INSIRA_SEU_STORAGE_BUCKET_AQUI
VITE_FIREBASE_MESSAGING_SENDER_ID=INSIRA_SEU_MESSAGING_SENDER_ID_AQUI
VITE_FIREBASE_APP_ID=INSIRA_SEU_APP_ID_AQUI`;
    
    navigator.clipboard.writeText(envText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // ======================================================
  // TELA 0: DE SETUP DO FIREBASE (EXIBIDA QUANDO NÃO CONFIGURADO)
  // ======================================================
  if (!isFirebaseConfigured && !useLocalDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-950 to-amber-900 flex items-center justify-center p-4 font-['Fredoka']">
        <div className="w-full max-w-2xl bg-black/50 backdrop-blur-xl border border-orange-500/25 p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
          
          <div className="text-center space-y-2 relative z-10">
            <span className="text-6xl animate-bounce inline-block">🐐</span>
            <h1 className="title-font text-5xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-red-400 font-extrabold">Banco de Dados Real-time</h1>
            <p className="text-amber-100/70 text-base">Habilite conexões online reais para o Dominó dos Cabras!</p>
          </div>

          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex gap-3 text-amber-200 relative z-10">
            <ShieldAlert className="flex-shrink-0 mt-1 text-orange-400" size={24} />
            <div>
              <p className="font-bold text-orange-300">Chaves de API ausentes</p>
              <p className="text-sm text-amber-200/70">O projeto foi estruturado com sucesso! Agora, necessita de um banco de dados real Firebase para ativar o multiplayer real-time online.</p>
            </div>
          </div>

          <div className="space-y-4 text-amber-100 relative z-10">
            <h3 className="font-bold text-lg text-orange-400 border-b border-orange-500/20 pb-2 flex items-center gap-2">
              <Star size={18} className="text-orange-400" />
              Como configurar em 2 minutos (Grátis):
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-amber-100/80">
              <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-bold">Console do Firebase</a> e crie um projeto gratuito.</li>
              <li>No painel esquerdo do projeto, vá em **Build → Firestore Database** e ative o banco em **Modo de Teste**.</li>
              <li>Volte à página inicial do projeto, clique no ícone **`&lt;/&gt;`** (Web) para gerar as credenciais do seu aplicativo.</li>
              <li>Crie um arquivo chamado <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-orange-300">.env</code> na raiz do projeto e cole suas credenciais nele.</li>
            </ol>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex justify-between items-center relative z-10">
            <pre className="text-xs text-amber-300/50 font-mono select-all">
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...`}
            </pre>
            <button
              onClick={copyEnvCode}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-lg active:scale-95 text-white py-2.5 px-5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
            >
              {copiedText ? <Check size={16} /> : <Copy size={16} />}
              {copiedText ? 'Copiado!' : 'Copiar Modelo .env'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            <button
              onClick={() => setUseLocalDemo(true)}
              className="flex-1 bg-white/5 hover:bg-white/10 active:scale-95 text-amber-200 border border-amber-500/20 font-bold py-3.5 rounded-xl transition"
            >
              Modo Demo Local (Simulado)
            </button>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-center active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Ir ao Console do Firebase →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // TELA 1: LOGIN E REGISTRO PREMIUM
  // ======================================================
  if (screen === 'login' || screen === 'register') {
    return (
      <div className="min-h-screen sertao-sunset flex items-center justify-center p-4 font-['Fredoka'] relative overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.15) 35px, rgba(0,0,0,.15) 70px)`,
        }}>
        {/* Poeira estelar flutuante decorativa */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl float-anim"></div>
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl float-anim" style={{ animationDelay: '2s' }}></div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo Flutuante */}
          <div className="text-center mb-8 float-anim">
            <span className="text-7xl drop-shadow-2xl filter block mb-2">🐐</span>
            <h1 className="title-font text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-red-400 drop-shadow-lg tracking-wide">
              Dominó dos Cabras
            </h1>
            <p className="text-amber-200/60 text-sm mt-2 tracking-wider font-light uppercase">
              {useLocalDemo ? '⚡ Modo Offline Simulado ⚡' : '👑 A Maior Liga do Sertão 👑'}
            </p>
          </div>

          {/* Abas Tipo Game UI */}
          <div className="flex gap-2.5 mb-6 bg-black/30 backdrop-blur-md p-1.5 rounded-2xl border border-orange-500/10">
            <button
              onClick={() => setScreen('login')}
              className={`flex-1 py-3.5 rounded-xl font-bold transition-all text-sm uppercase tracking-wider ${
                screen === 'login' 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg pulse-glow-orange' 
                  : 'text-amber-100/50 hover:text-amber-100 hover:bg-white/5'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setScreen('register')}
              className={`flex-1 py-3.5 rounded-xl font-bold transition-all text-sm uppercase tracking-wider ${
                screen === 'register' 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg pulse-glow-orange' 
                  : 'text-amber-100/50 hover:text-amber-100 hover:bg-white/5'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* FORMULÁRIO DE LOGIN */}
          {screen === 'login' && (
            <form onSubmit={handleLogin} className="glass-panel p-8 rounded-3xl border border-orange-500/20 space-y-5 shadow-2xl relative">
              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-2 uppercase tracking-widest">Nome de Usuário</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-amber-200/20 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-sm"
                  placeholder="Seu username do sertão"
                  required
                />
              </div>
              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-2 uppercase tracking-widest">Senha</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-amber-200/20 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-sm"
                  placeholder="Sua senha secreta"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-98 transition-all tracking-wider uppercase text-sm"
              >
                Entrar no Sertão 🤠
              </button>

              {useLocalDemo && (
                <div className="space-y-2 pt-2">
                  <p className="text-amber-200/50 text-xs text-center font-mono">
                    💡 Credenciais demo: "CabraLoka" / "123"
                  </p>
                  {isFirebaseConfigured && (
                    <button
                      type="button"
                      onClick={() => setUseLocalDemo(false)}
                      className="w-full bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs font-bold py-2.5 rounded-xl hover:bg-orange-500/20 transition-all"
                    >
                      Ativar Conexão Real-time (Firebase)
                    </button>
                  )}
                </div>
              )}
            </form>
          )}

          {/* FORMULÁRIO DE REGISTRO */}
          {screen === 'register' && (
            <form onSubmit={handleRegister} className="glass-panel p-8 rounded-3xl border border-orange-500/20 space-y-5 shadow-2xl">
              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-2 uppercase tracking-widest">Nome de Usuário</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-amber-200/20 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-sm"
                  placeholder="Crie seu username"
                />
              </div>

              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-2 uppercase tracking-widest">Sua Senha</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-amber-200/20 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-sm"
                  placeholder="Mínimo de 3 dígitos"
                />
              </div>

              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-2 uppercase tracking-widest">Confirmar Senha</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-amber-200/20 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-sm"
                  placeholder="Repita sua senha"
                />
              </div>

              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-3 uppercase tracking-widest">Avatar de Cabra</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {profilePicOptions.map(pic => (
                    <button
                      key={pic}
                      type="button"
                      onClick={() => setRegisterForm({ ...registerForm, profilePic: pic })}
                      className={`text-3xl p-2.5 rounded-2xl transition-all duration-200 active:scale-95 ${
                        registerForm.profilePic === pic 
                          ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/35 border-2 border-white/20 ring-4 ring-orange-500/15' 
                          : 'bg-white/5 hover:bg-white/10 text-amber-100/70 border border-white/5'
                      }`}
                    >
                      {pic}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-98 transition-all tracking-wider uppercase text-sm"
              >
                Criar Minha Cabra 🐐
              </button>

              <button
                type="button"
                onClick={() => setScreen('login')}
                className="w-full text-amber-200/60 py-2 hover:text-amber-50 text-center text-xs transition"
              >
                ← Voltar ao Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ======================================================
  // TELA 2: HOME / LOBBY PREMIUM
  // ======================================================
  if (screen === 'home' && !editProfile) {
    return (
      <div className="min-h-screen sertao-sunset text-white font-['Fredoka'] pb-12"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.15) 35px, rgba(0,0,0,.15) 70px)`,
        }}>
        
        {/* Navbar Flutuante Glassmorphic */}
        <header className="sticky top-4 z-50 max-w-6xl mx-auto px-4 w-full">
          <div className="glass-panel rounded-3xl p-4 flex justify-between items-center border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20">
                <span className="text-3xl block">🐐</span>
              </div>
              <div>
                <h1 className="title-font text-2xl font-bold bg-gradient-to-r from-amber-100 via-amber-200 to-orange-300 bg-clip-text text-transparent">
                  Dominó dos Cabras
                </h1>
                {!useLocalDemo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 border border-green-500/30 text-green-400 uppercase tracking-widest mt-0.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                    Rede Ativa
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 items-center">
              {/* LP Badge */}
              <div className="bg-black/30 backdrop-blur border border-white/5 py-1.5 px-3 rounded-2xl flex items-center gap-2">
                <Award size={16} className="text-amber-400 animate-pulse" />
                <div className="text-left leading-none">
                  <span className="text-amber-300 text-xs font-mono font-bold block">{currentUser.leaguePoints}</span>
                  <span className="text-[8px] text-amber-200/50 uppercase tracking-widest font-bold">pontos</span>
                </div>
              </div>

              {/* Glass Buttons */}
              <button
                onClick={() => setEditProfile(true)}
                title="Editar Perfil"
                className="bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500 text-white p-3 rounded-xl transition-all duration-200 active:scale-95"
              >
                <User size={18} />
              </button>
              <button
                onClick={() => setScreen('league')}
                title="Tabela de Líderes"
                className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 text-white p-3 rounded-xl transition-all duration-200 active:scale-95"
              >
                <Trophy size={18} />
              </button>
              <button
                onClick={handleLogout}
                title="Sair da Conta"
                className="bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-white p-3 rounded-xl transition-all duration-200 active:scale-95"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="max-w-6xl mx-auto p-4 mt-8 space-y-8">
          
          {/* Card Central com Avatar Grande */}
          <section className="glass-panel rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <span className="text-7xl bg-black/40 p-4 rounded-3xl border border-white/5 shadow-2xl float-anim">{currentUser.profilePic}</span>
              <div>
                <p className="text-amber-200/50 text-xs uppercase tracking-widest font-bold">Jogador Conectado</p>
                <h2 className="title-font text-3xl font-extrabold">{currentUser.username}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {currentUser.champion ? (
                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">👑 Campeão</span>
                  ) : (
                    <span className="bg-stone-500/20 border border-white/5 text-amber-100/60 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">🚀 Em Ascensão</span>
                  )}
                </div>
              </div>
            </div>

            {/* Matchmaking Banner - Destaque Heróico */}
            <button
              onClick={handleStartMatchmaking}
              disabled={waitingForMatch}
              className="group relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-85 rounded-3xl p-8 text-white font-bold text-xl transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/20 active:scale-98 disabled:cursor-not-allowed border border-white/10 w-full md:w-80 h-32 flex items-center justify-center shadow-lg"
            >
              <div className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full bg-amber-400/20 blur-xl group-hover:scale-130 transition-all duration-500"></div>
              <div className="relative z-10 text-center flex flex-col items-center">
                <div className="text-4xl mb-1.5 group-hover:scale-115 transition-all duration-300 group-hover:rotate-12">🎲🁢</div>
                {waitingForMatch ? (
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex gap-1.5 items-center justify-center">
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                    <span className="text-xs font-normal text-amber-100">
                      {useLocalDemo ? 'Buscando bots...' : 'Aguardando parceiro real...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="title-font text-2xl tracking-wider block uppercase font-extrabold">Iniciar Partida</span>
                    <span className="text-[10px] font-normal text-amber-200/70 block mt-1 tracking-widest uppercase">Jogue em dupla cooperativa!</span>
                  </>
                )}
              </div>
            </button>
          </section>

          {/* Grid de Seções */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Jogadores Online (Lista Estilizada) */}
            <div className="glass-panel rounded-3xl p-6 lg:col-span-2 space-y-4">
              <h2 className="font-['Righteous'] text-2xl text-amber-300 flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse shadow-md shadow-green-500/50"></span>
                Cabras Online no Lobby
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onlinePlayers.length > 0 ? (
                  onlinePlayers.map((player, index) => (
                    <div key={index} className="bg-white/5 border border-white/5 hover:border-orange-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span className="text-4xl bg-black/20 p-2 rounded-xl block border border-white/5">{player.profilePic}</span>
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-stone-900 rounded-full pulse-green"></span>
                        </div>
                        <div>
                          <p className="text-amber-50 font-bold">{player.username}</p>
                          <p className="text-orange-400 text-xs">{player.leaguePoints || 0} pts • {player.wins || 0}V</p>
                        </div>
                      </div>
                      <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 font-bold uppercase tracking-wider">Ativo</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-12 text-center text-amber-200/30 flex flex-col items-center gap-2">
                    <Users size={32} />
                    <p className="text-sm font-medium">Nenhuma outra cabra no lobby no momento...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Suas Estatísticas (Estilo Dashboard) */}
            <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-6">
              <h3 className="font-['Righteous'] text-2xl text-amber-300">📊 Suas Estatísticas</h3>
              
              <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <span className="text-amber-100/70 text-sm">Vitórias Totais</span>
                  <span className="font-bold text-orange-400 text-xl font-mono">{currentUser.wins || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <span className="text-amber-100/70 text-sm">Pontos na Liga</span>
                  <span className="font-bold text-orange-400 text-xl font-mono">{currentUser.leaguePoints || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <span className="text-amber-100/70 text-sm">Status Atual</span>
                  <span className="font-bold text-amber-300 text-sm uppercase tracking-wider">
                    {currentUser.champion ? '👑 CAMPEÃO' : 'Desafiante 🚀'}
                  </span>
                </div>
              </div>
            </div>

          </section>

          {/* Info da Liga */}
          <section className="glass-panel rounded-3xl p-6 border-l-4 border-amber-500/70 flex gap-4 items-center">
            <div className="bg-amber-500/10 p-3.5 rounded-2xl text-amber-400">
              <Info size={28} />
            </div>
            <div>
              <h3 className="font-['Righteous'] text-lg text-amber-200">ℹ️ Regras da Cabra's League</h3>
              <p className="text-amber-100/70 text-sm leading-relaxed mt-1">
                A **Cabra's League** é uma competição mensal real-time. Cada vitória em dupla soma **10 pontos** no placar. O Top 1 garante uma **INSÍGNIA DE CAMPEÃO** 👑 definitiva no perfil no fim do mês!
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ==================== TELA EDITAR PERFIL ====================
  if (editProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 p-6 font-['Fredoka'] flex items-center justify-center"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px)`,
        }}>
        <div className="max-w-md w-full">
          <button
            onClick={() => setEditProfile(false)}
            className="mb-4 text-amber-200 hover:text-white font-bold flex items-center gap-1 text-sm bg-black/30 px-3.5 py-2 rounded-xl border border-white/5 transition"
          >
            ← Cancelar e Voltar
          </button>

          <div className="glass-panel rounded-3xl p-8 border border-orange-500/20 shadow-2xl relative">
            <h2 className="font-['Righteous'] text-3xl text-amber-200 mb-8 text-center">Editar Perfil</h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Emoji Perfil */}
              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-4 uppercase tracking-widest text-center">Escolha seu novo Avatar</label>
                <div className="text-center mb-6 text-8xl bg-black/40 p-4 rounded-3xl w-28 h-28 mx-auto flex items-center justify-center border border-white/5 shadow-inner float-anim">
                  {editForm.profilePic || currentUser.profilePic}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {profilePicOptions.map(pic => (
                    <button
                      key={pic}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, profilePic: pic })}
                      className={`text-3xl p-2.5 rounded-2xl transition-all duration-200 active:scale-95 ${
                        (editForm.profilePic || currentUser.profilePic) === pic 
                          ? 'bg-orange-500 text-white scale-110 shadow-lg border-2 border-white/20' 
                          : 'bg-white/5 hover:bg-white/10 text-amber-100/70 border border-white/5'
                      }`}
                    >
                      {pic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome de Usuário */}
              <div>
                <label className="block text-amber-200/80 text-xs font-bold mb-2 uppercase tracking-widest">Nome de Usuário</label>
                <input
                  type="text"
                  value={editForm.username !== undefined ? editForm.username : currentUser.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  disabled={!useLocalDemo} // Impede alterar nome de usuário no Firestore para evitar quebra de documentos
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm focus:border-orange-500 transition"
                />
                {!useLocalDemo && (
                  <p className="text-[10px] text-amber-300/40 mt-1.5 italic font-mono">🔒 O nome de usuário na rede é permanente para evitar conflitos.</p>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all active:scale-98 text-sm uppercase tracking-wider"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // TELA 3: LEADERBOARD COM PODIUM 3D PREMIUM
  // ======================================================
  if (screen === 'league') {
    // Dividimos os líderes entre Top 3 (Pódio) e o resto (Lista)
    const top3 = realtimeLeaderboard.slice(0, 3);
    const podiumOrder = [];
    if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2 });
    if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1 });
    if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3 });
    
    const theRest = realtimeLeaderboard.slice(3);

    return (
      <div className="min-h-screen sertao-sunset text-white font-['Fredoka'] pb-12"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.15) 35px, rgba(0,0,0,.15) 70px)`,
        }}>
        
        {/* Header */}
        <header className="bg-black/45 backdrop-blur-md border-b border-orange-500/20 p-4 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="font-['Righteous'] text-3xl text-amber-200 flex items-center gap-2">
              <span>👑 Cabra's League (Mensal)</span>
            </h1>
            <button
              onClick={() => setScreen('home')}
              className="bg-orange-500/10 border border-orange-500/35 hover:bg-orange-500 text-white py-2 px-5 rounded-xl font-bold transition-all text-sm uppercase tracking-wider active:scale-95"
            >
              ← Voltar
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 space-y-10 mt-6">
          
          {/* ==========================================
              PODIUM 3D VISUAL DE LÍDERES
             ========================================== */}
          {top3.length > 0 && (
            <section className="glass-panel rounded-3xl p-6 border border-orange-500/15">
              <h2 className="title-font text-xl text-center text-amber-300 uppercase tracking-widest mb-4">🏆 Os Três Reis do Sertão</h2>
              
              <div className="podium-container pt-8">
                {podiumOrder.map((user, idx) => {
                  const isFirst = user.rank === 1;
                  const isSecond = user.rank === 2;
                  
                  return (
                    <div 
                      key={idx}
                      className={`podium-pillar ${
                        isFirst 
                          ? 'podium-gold w-32 sm:w-36 h-48 sm:h-52 z-10' 
                          : isSecond 
                          ? 'podium-silver w-24 sm:w-28 h-36 sm:h-40' 
                          : 'podium-bronze w-24 sm:w-28 h-28 sm:h-32'
                      }`}
                    >
                      {/* Floating Avatar */}
                      <div className="absolute -top-12 sm:-top-14 flex flex-col items-center">
                        {isFirst && <span className="text-3xl text-amber-300 drop-shadow-md mb-1 animate-bounce">👑</span>}
                        <span className="text-5xl sm:text-6xl bg-stone-900 border-2 border-stone-800 p-2.5 rounded-full block shadow-2xl">
                          {user.profilePic}
                        </span>
                      </div>

                      {/* Rank & Name */}
                      <div className="text-center p-3 w-full space-y-0.5">
                        <p className="text-stone-950 font-['Righteous'] text-3xl sm:text-4xl drop-shadow-sm leading-none">
                          {user.rank}º
                        </p>
                        <p className="text-stone-950 font-bold text-xs sm:text-sm truncate w-full px-1">
                          {user.username}
                        </p>
                        <p className="text-stone-900/85 font-mono text-[10px] sm:text-xs font-bold">
                          {user.leaguePoints} pts
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==========================================
              LISTA DO RESTANTE DOS JOGADORES
             ========================================== */}
          <section className="space-y-3">
            <h3 className="font-['Righteous'] text-xl text-amber-300 tracking-wider">⚔️ Demais Desafiantes</h3>
            
            <div className="space-y-2">
              {theRest.length > 0 ? (
                theRest.map((user, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      (user.id || user.username) === (currentUser.id || currentUser.username)
                        ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/5'
                        : 'glass-panel border-white/5 hover:border-orange-500/20'
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 text-center">
                      <span className="font-['Righteous'] text-lg text-amber-200/50">#{idx + 4}</span>
                    </div>

                    <div className="flex-shrink-0 text-3xl bg-black/35 p-1.5 rounded-xl border border-white/5">{user.profilePic}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-amber-50 font-bold text-base truncate">{user.username}</p>
                        {user.champion && <span className="text-sm">👑</span>}
                      </div>
                      <p className="text-orange-400/70 text-xs">{user.wins || 0} vitórias no sertão</p>
                    </div>

                    <div className="text-right">
                      <p className="text-orange-300 font-['Righteous'] text-xl font-mono">{user.leaguePoints || 0}</p>
                      <p className="text-amber-200/40 text-[9px] uppercase tracking-widest font-bold">pontos</p>
                    </div>
                  </div>
                ))
              ) : (
                top3.length === 0 && <p className="text-amber-200/35 text-center py-12">Nenhum jogador classificado no momento...</p>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ======================================================
  // TELA 4: TABULEIRO VIRTUAL REDONDO DE JOGO E PEÇAS DE DOMINÓ
  // ======================================================
  if (screen === 'game' && gameState) {
    return (
      <div className="h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 flex flex-col font-['Fredoka'] overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.15) 35px, rgba(0,0,0,.15) 70px)`,
        }}>
        
        <style>{`
          .chat-container { overflow-y: auto; }
        `}</style>

        {/* Header do Jogo */}
        <header className="bg-black/50 backdrop-blur-md border-b border-orange-500/20 p-4 z-40">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="font-['Righteous'] text-xl text-amber-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
              <span>🎮 Mesa de Jogo</span>
            </div>
            
            {/* Placar de Jogo Tridimensional */}
            <div className="flex gap-8 text-center bg-black/40 px-6 py-2 rounded-2xl border border-white/5 shadow-inner">
              <div className="leading-tight">
                <p className="text-amber-200/50 text-[10px] uppercase font-bold tracking-wider">Seu Time</p>
                <p className="text-3xl font-extrabold text-orange-400 font-mono">
                  {gameState.score.team1}
                </p>
              </div>
              <div className="text-amber-200/30 text-xl font-bold flex items-center">VS</div>
              <div className="leading-tight">
                <p className="text-amber-200/50 text-[10px] uppercase font-bold tracking-wider">Inimigos</p>
                <p className="text-3xl font-extrabold text-red-500 font-mono">
                  {gameState.score.team2}
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!useLocalDemo && activeMatchId) {
                  const matchRef = doc(db, 'matches', activeMatchId);
                  await deleteDoc(matchRef).catch(console.error);
                  setActiveMatchId(null);
                }
                setGameState(null);
                setScreen('home');
              }}
              className="bg-red-500/10 border border-red-500/30 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              ← Abandonar
            </button>
          </div>
        </header>

        {/* Tabuleiro Tridimensional Redondo e Painel lateral */}
        <main className="flex-1 flex gap-4 max-w-7xl mx-auto w-full p-4 overflow-hidden items-stretch">
          
          {/* LADO A: TABULEIRO VIRTUAL REDONDO DE JOGO */}
          <div className="flex-1 flex flex-col justify-between items-center p-2">
            
            {/* O TABULEIRO CIRCULAR VIRTUAL */}
            <div className="round-table w-full aspect-square max-w-lg rounded-full flex items-center justify-center relative flex-shrink-0 my-auto">
              <div className="table-wood-rim"></div>

              {/* JOGADOR NORTE (PARCEIRO) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="text-4xl bg-stone-900 border-2 border-stone-800 p-2.5 rounded-full block shadow-lg">
                  {gameState.partnerProfilePic || '🤝'}
                </span>
                <div className="bg-black/60 px-3 py-1 rounded-full border border-orange-500/25 mt-1 max-w-[120px]">
                  <p className="text-[10px] text-orange-400 font-bold truncate text-center">{gameState.partnerName}</p>
                  <p className="text-[8px] text-amber-200/50 uppercase text-center leading-none">Parceiro</p>
                </div>
              </div>

              {/* JOGADOR OESTE (ADVERSÁRIO 1) */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <span className="text-4xl bg-stone-900 border-2 border-stone-800 p-2.5 rounded-full block shadow-lg">
                  🤠
                </span>
                <div className="bg-black/60 px-3 py-1 rounded-full border border-red-500/25 mt-1 max-w-[120px]">
                  <p className="text-[10px] text-red-400 font-bold truncate text-center">{gameState.opponent1Name}</p>
                  <p className="text-[8px] text-amber-200/50 uppercase text-center leading-none">Inimigo 1</p>
                </div>
              </div>

              {/* JOGADOR LESTE (ADVERSÁRIO 2) */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <span className="text-4xl bg-stone-900 border-2 border-stone-800 p-2.5 rounded-full block shadow-lg">
                  🎯
                </span>
                <div className="bg-black/60 px-3 py-1 rounded-full border border-red-500/25 mt-1 max-w-[120px]">
                  <p className="text-[10px] text-red-400 font-bold truncate text-center">{gameState.opponent2Name}</p>
                  <p className="text-[8px] text-amber-200/50 uppercase text-center leading-none">Inimigo 2</p>
                </div>
              </div>

              {/* JOGADOR SUL (VOCÊ!) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="text-4xl bg-stone-900 border-4 border-amber-500 p-2.5 rounded-full block shadow-xl ring-4 ring-amber-500/25">
                  {currentUser.profilePic}
                </span>
                <div className="bg-black/80 px-4 py-1.5 rounded-full border-2 border-amber-500 mt-1 max-w-[140px] shadow-lg">
                  <p className="text-xs text-amber-200 font-bold truncate text-center">{currentUser.username}</p>
                  <p className="text-[9px] text-amber-400 uppercase text-center leading-none font-bold">Você</p>
                </div>
              </div>

              {/* CENTRO DA MESA - STATUS CENTRAL DO JOGO */}
              <div className="bg-black/60 backdrop-blur-md rounded-full w-36 h-36 border border-white/10 flex flex-col justify-center items-center text-center p-3 shadow-inner">
                {gameState.status === 'finished' ? (
                  <div className="space-y-1">
                    <span className="text-3xl animate-bounce block">🏆</span>
                    <h4 className="title-font text-sm font-bold text-amber-300 uppercase leading-none">Vitória!</h4>
                    <p className="text-[9px] text-amber-200/50">Pontos computados!</p>
                  </div>
                ) : (
                  <div className="space-y-1 relative">
                    <div className="text-3xl float-anim">🁢</div>
                    <h4 className="title-font text-sm font-bold text-amber-200">Rodada {gameState.round}</h4>
                    <p className="text-[9px] text-amber-200/50 uppercase tracking-widest font-mono">Em progresso</p>
                  </div>
                )}
              </div>

            </div>

            {/* BOTÕES ESTILIZADOS COMO PEÇAS DE DOMINÓ REALISTAS */}
            <div className="w-full max-w-md bg-black/40 backdrop-blur border border-white/5 rounded-3xl p-4 flex gap-4 items-center justify-between shadow-2xl relative z-10">
              {gameState.status === 'finished' ? (
                <button
                  onClick={() => {
                    setGameState(null);
                    setScreen('home');
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-lg active:scale-95 text-white font-bold py-3.5 rounded-xl transition text-sm uppercase tracking-wider font-sans"
                >
                  Voltar para o Lobby 🐐
                </button>
              ) : (
                <>
                  {/* Pedra de Dominó Branca (Você Marca) */}
                  <button
                    onClick={() => handleScoreUpdate('team1')}
                    className="domino-tile-white flex flex-col items-center justify-center p-3 rounded-2xl font-bold w-full h-16 relative overflow-hidden"
                  >
                    <span className="text-[8px] uppercase tracking-widest font-bold text-black/50 block mb-0.5">Nós Marcamos</span>
                    <div className="flex gap-2.5 items-center justify-center">
                      <span className="text-xl font-bold font-mono">🁢</span>
                      <span className="text-sm font-sans tracking-wide uppercase">Ponto 🐐</span>
                    </div>
                  </button>

                  {/* Pedra de Dominó Preta (Eles Marcam) */}
                  <button
                    onClick={() => handleScoreUpdate('team2')}
                    className="domino-tile-black flex flex-col items-center justify-center p-3 rounded-2xl font-bold w-full h-16 relative overflow-hidden"
                  >
                    <span className="text-[8px] uppercase tracking-widest font-bold text-white/40 block mb-0.5">Eles Marcam</span>
                    <div className="flex gap-2.5 items-center justify-center">
                      <span className="text-xl font-bold font-mono">🁢</span>
                      <span className="text-sm font-sans tracking-wide uppercase">Ponto 💥</span>
                    </div>
                  </button>
                  
                  {gameState.score.team1 >= 1 && (
                    <button
                      onClick={handleWinGame}
                      title="Gritar vitória final!"
                      className="bg-green-600 hover:bg-green-700 active:scale-95 text-white p-3 rounded-2xl shadow-lg transition-all text-xl"
                    >
                      🏆
                    </button>
                  )}
                </>
              )}
            </div>

          </div>

          {/* LADO B: CHAT E EMOTES TRANSPARENTES */}
          <div className="w-80 flex flex-col glass-panel rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
            
            {/* Mensagens de Chat */}
            <div className="chat-container flex-1 p-4 space-y-3.5 overflow-y-auto font-sans">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl text-xs ${
                    msg.type === 'system'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200 text-center italic shadow-inner'
                      : msg.isEmote
                      ? 'bg-white/5 border border-white/5 text-center text-4xl py-3 animate-bounce'
                      : 'bg-white/5 border border-white/5 text-amber-100'
                  }`}
                >
                  {msg.type === 'system' ? (
                    msg.text
                  ) : msg.isEmote ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-orange-400 font-bold block mb-1 uppercase tracking-widest">{msg.author} soltou:</span>
                      <span>{msg.text}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-orange-400">{msg.author}</span>
                        {msg.timestamp && <span className="text-amber-200/30 text-[9px] font-mono">{msg.timestamp}</span>}
                      </div>
                      <p className="text-amber-50 font-normal leading-relaxed">{msg.text}</p>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Painel de Emotes */}
            <div className="border-t border-white/5 p-2 bg-black/35 flex gap-1.5 flex-wrap justify-center">
              {emotes.map(emote => (
                <button
                  key={emote.id}
                  onClick={() => handleSendEmote(emote.emoji)}
                  title={emote.label}
                  className="text-2xl p-2 hover:bg-white/10 active:scale-95 rounded-xl transition-all"
                >
                  {emote.emoji}
                </button>
              ))}
            </div>

            {/* Formulário de Input de Chat */}
            <form onSubmit={handleSendMessage} className="border-t border-white/5 p-3 flex gap-2.5 bg-black/40">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Provocar cabras..."
                maxLength="50"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs placeholder-amber-200/30 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-2.5 rounded-xl hover:shadow-lg transition-all active:scale-95"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

        </main>
      </div>
    );
  }

  return null;
}