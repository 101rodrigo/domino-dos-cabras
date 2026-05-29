import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, LogOut, User, Trophy, Zap, Flame, Ghost, Smile, Laugh } from 'lucide-react';

export default function DominoDasCabras() {
  // Estados principais
  const [currentUser, setCurrentUser] = useState(null);
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
  
  const profilePicOptions = ['🐐', '🤠', '🍺', '🎸', '🔥', '⭐', '💎', '🏆', '🎭', '🌟'];
  const emotes = [
    { id: 'laugh', emoji: '😂', label: 'Risada' },
    { id: 'wow', emoji: '😮', label: 'Wow' },
    { id: 'fire', emoji: '🔥', label: 'Fogo' },
    { id: 'thinking', emoji: '🤔', label: 'Pensando' },
    { id: 'skull', emoji: '💀', label: 'Morto' },
    { id: 'clap', emoji: '👏', label: 'Aplauso' },
  ];

  // Simular jogadores online
  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameState) {
        setOnlinePlayers(users.filter(u => u.id !== currentUser?.id && Math.random() > 0.3).slice(0, 3));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [users, currentUser, gameState]);

  // Auto-scroll no chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      setScreen('home');
      setLoginForm({ username: '', password: '' });
    } else {
      alert('Usuário ou senha incorretos!');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('Senhas não conferem!');
      return;
    }
    const newUser = {
      id: Math.max(...users.map(u => u.id)) + 1,
      username: registerForm.username,
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
  };

  const handleStartMatchmaking = () => {
    setWaitingForMatch(true);
    setTimeout(() => {
      if (onlinePlayers.length > 0) {
        const partner = onlinePlayers[Math.floor(Math.random() * onlinePlayers.length)];
        const opponent1 = users[Math.floor(Math.random() * users.length)];
        const opponent2 = users[Math.floor(Math.random() * users.length)];
        
        setGameState({
          playerId: currentUser.id,
          playerName: currentUser.username,
          partnerId: partner.id,
          partnerName: partner.username,
          opponent1Id: opponent1.id,
          opponent1Name: opponent1.username,
          opponent2Id: opponent2.id,
          opponent2Name: opponent2.username,
          score: { team1: 0, team2: 0 },
          round: 1,
        });
        setChatMessages([{ type: 'system', text: `Partida iniciada! Você está com ${partner.username}` }]);
        setWaitingForMatch(false);
        setScreen('game');
      }
    }, 2000);
  };

  const handleWinGame = () => {
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id || u.id === gameState.partnerId) {
        return {
          ...u,
          leaguePoints: u.leaguePoints + 10,
          wins: u.wins + 1,
          champion: (u.leaguePoints + 10) >= 100 ? true : u.champion,
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
  };

  const handleSendMessage = (e, isEmote = false) => {
    e.preventDefault();
    if (!chatInput && !isEmote) return;

    const message = {
      author: currentUser.username,
      text: isEmote ? chatInput : chatInput,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isEmote: isEmote,
    };

    setChatMessages(prev => [...prev, message]);
    setChatInput('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen('login');
    setGameState(null);
    setChatMessages([]);
    setLoginForm({ username: '', password: '' });
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    const updated = {
      ...currentUser,
      ...editForm,
    };
    const updatedUsers = users.map(u => u.id === currentUser.id ? updated : u);
    setUsers(updatedUsers);
    localStorage.setItem('domino_users', JSON.stringify(updatedUsers));
    setCurrentUser(updated);
    setEditProfile(false);
    setEditForm({});
  };

  // ==================== TELA LOGIN ====================
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 flex items-center justify-center p-4 font-['Fredoka']"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px)`,
        }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Righteous&display=swap');
          * { font-family: 'Fredoka', sans-serif; }
          .title-font { font-family: 'Righteous', sans-serif; }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          .float-anim { animation: float 3s ease-in-out infinite; }
          @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.3); } 50% { box-shadow: 0 0 40px rgba(251, 146, 60, 0.6); } }
          .glow { animation: pulse-glow 2s ease-in-out infinite; }
          input:focus { outline: none; border-color: #fb923c; }
          button:hover { transform: translateY(-2px); }
          button:active { transform: translateY(0); }
        `}</style>

        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8 float-anim">
            <h1 className="title-font text-6xl text-amber-100 drop-shadow-lg mb-2">🐐</h1>
            <h1 className="title-font text-5xl text-amber-50 drop-shadow-lg">Dominó dos Cabras</h1>
            <p className="text-amber-100 text-lg mt-2 font-light">A Maior Liga de Dominó do Sertão</p>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setScreen('login')}
              className={`flex-1 py-3 rounded-lg font-bold transition-all glow ${
                screen === 'login' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-orange-400/20 text-amber-100 hover:bg-orange-400/30'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setScreen('register')}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                screen === 'register' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-orange-400/20 text-amber-100 hover:bg-orange-400/30'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Form Login */}
          <form onSubmit={handleLogin} className="bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-orange-400/40 space-y-4">
            <div>
              <label className="block text-amber-100 text-sm font-bold mb-2">Nome de Usuário</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full bg-white/10 border-2 border-orange-400/50 rounded-lg px-4 py-3 text-white placeholder-amber-200/50"
                placeholder="seu username"
              />
            </div>
            <div>
              <label className="block text-amber-100 text-sm font-bold mb-2">Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full bg-white/10 border-2 border-orange-400/50 rounded-lg px-4 py-3 text-white placeholder-amber-200/50"
                placeholder="sua senha"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all"
            >
              Entrar
            </button>
            <p className="text-amber-100/70 text-sm text-center">
              💡 Demo: use "CabraLoka" / "123"
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ==================== TELA REGISTRO ====================
  if (screen === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 flex items-center justify-center p-4 font-['Fredoka']"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px)`,
        }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Righteous&display=swap');
        `}</style>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-['Righteous'] text-5xl text-amber-50 drop-shadow-lg">Bem-vindo! 🐐</h1>
            <p className="text-amber-100 text-sm mt-2">Crie sua conta e entre na Cabra's League</p>
          </div>

          <form onSubmit={handleRegister} className="bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-orange-400/40 space-y-4">
            <div>
              <label className="block text-amber-100 text-sm font-bold mb-2">Nome de Usuário</label>
              <input
                type="text"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                required
                className="w-full bg-white/10 border-2 border-orange-400/50 rounded-lg px-4 py-3 text-white placeholder-amber-200/50"
                placeholder="seu username"
              />
            </div>

            <div>
              <label className="block text-amber-100 text-sm font-bold mb-2">Sua Senha</label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                required
                className="w-full bg-white/10 border-2 border-orange-400/50 rounded-lg px-4 py-3 text-white placeholder-amber-200/50"
                placeholder="crie uma senha"
              />
            </div>

            <div>
              <label className="block text-amber-100 text-sm font-bold mb-2">Confirmar Senha</label>
              <input
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                required
                className="w-full bg-white/10 border-2 border-orange-400/50 rounded-lg px-4 py-3 text-white placeholder-amber-200/50"
                placeholder="repita a senha"
              />
            </div>

            <div>
              <label className="block text-amber-100 text-sm font-bold mb-3">Escolha seu Emoji de Perfil</label>
              <div className="grid grid-cols-5 gap-2">
                {profilePicOptions.map(pic => (
                  <button
                    key={pic}
                    type="button"
                    onClick={() => setRegisterForm({ ...registerForm, profilePic: pic })}
                    className={`text-3xl p-2 rounded-lg transition-all ${
                      registerForm.profilePic === pic 
                        ? 'bg-orange-500 scale-110' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {pic}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all"
            >
              Criar Conta
            </button>

            <button
              type="button"
              onClick={() => setScreen('login')}
              className="w-full text-amber-100 py-2 hover:text-amber-50"
            >
              ← Voltar ao Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== TELA HOME ====================
  if (screen === 'home' && !editProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 font-['Fredoka']"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px)`,
        }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Righteous&display=swap');
          .nav-btn { transition: all 0.3s; }
          .nav-btn:hover { transform: translateY(-2px); }
          .nav-btn.active { transform: scale(1.05); }
        `}</style>

        {/* Header */}
        <header className="bg-black/40 backdrop-blur-md border-b border-orange-400/40 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="font-['Righteous'] text-3xl text-amber-50">🐐 Dominó dos Cabras</h1>
            <div className="flex gap-4 items-center">
              <div className="text-right">
                <p className="text-amber-100 font-bold">{currentUser.username}</p>
                <p className="text-orange-300 text-sm">{currentUser.leaguePoints} pontos</p>
              </div>
              <button
                onClick={() => setEditProfile(true)}
                className="nav-btn bg-orange-500/80 hover:bg-orange-500 text-white p-3 rounded-lg"
              >
                <User size={20} />
              </button>
              <button
                onClick={() => setScreen('league')}
                className="nav-btn bg-amber-600/80 hover:bg-amber-600 text-white p-3 rounded-lg"
              >
                <Trophy size={20} />
              </button>
              <button
                onClick={handleLogout}
                className="nav-btn bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-lg"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="max-w-6xl mx-auto p-6 space-y-8">
          {/* Jogadores Online */}
          <section className="bg-black/40 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-6">
            <h2 className="font-['Righteous'] text-2xl text-amber-50 mb-4">🟢 Jogadores Online Agora</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {onlinePlayers.length > 0 ? (
                onlinePlayers.map(player => (
                  <div key={player.id} className="bg-white/5 border border-orange-400/30 rounded-xl p-4 hover:bg-white/10 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{player.profilePic}</span>
                      <div>
                        <p className="text-amber-50 font-bold">{player.username}</p>
                        <p className="text-orange-300 text-sm">{player.leaguePoints} pts • {player.wins}V</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-amber-100 col-span-3">Nenhum jogador online no momento...</p>
              )}
            </div>
          </section>

          {/* Ações Principais */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jogar */}
            <button
              onClick={handleStartMatchmaking}
              disabled={waitingForMatch}
              className="group relative bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 rounded-2xl p-8 text-white font-bold text-xl transition-all hover:shadow-2xl disabled:cursor-not-allowed"
            >
              <div className="text-5xl mb-3">🎲</div>
              {waitingForMatch ? (
                <>
                  <div className="animate-spin inline-block mr-2">⏳</div>
                  Procurando dupla...
                </>
              ) : (
                'INICIAR PARTIDA'
              )}
            </button>

            {/* Stats */}
            <div className="bg-black/40 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-6">
              <h3 className="font-['Righteous'] text-xl text-amber-50 mb-4">📊 Suas Estatísticas</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-amber-100">
                  <span>Vitórias</span>
                  <span className="font-bold text-orange-300">{currentUser.wins}</span>
                </div>
                <div className="flex justify-between text-amber-100">
                  <span>Pontos Cabra's League</span>
                  <span className="font-bold text-orange-300">{currentUser.leaguePoints}</span>
                </div>
                <div className="flex justify-between text-amber-100">
                  <span>Status</span>
                  <span className="font-bold text-amber-300">
                    {currentUser.champion ? '👑 CAMPEÃO' : 'Em Ascensão 🚀'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Info da Liga */}
          <section className="bg-black/40 backdrop-blur-md border-2 border-amber-500/40 rounded-2xl p-6">
            <h3 className="font-['Righteous'] text-xl text-amber-50 mb-3">ℹ️ Cabra's League</h3>
            <p className="text-amber-100 mb-3">
              A <strong>Cabra's League</strong> é uma competição mensal. Cada vitória em uma partida de dupla soma <strong>10 pontos</strong> para ambos os jogadores do time vencedor.
            </p>
            <p className="text-orange-300 font-bold">🏆 Ganhadores do mês ganham uma INSÍGNIA DE CAMPEÃO permanente no perfil!</p>
          </section>
        </main>
      </div>
    );
  }

  // ==================== TELA EDITAR PERFIL ====================
  if (editProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 p-6 font-['Fredoka']"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px)`,
        }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Righteous&display=swap');
        `}</style>

        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setEditProfile(false)}
            className="mb-4 text-amber-100 hover:text-amber-50 font-bold"
          >
            ← Voltar
          </button>

          <div className="bg-black/40 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-8">
            <h2 className="font-['Righteous'] text-3xl text-amber-50 mb-8 text-center">Editar Perfil</h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Emoji Perfil */}
              <div>
                <label className="block text-amber-100 font-bold mb-4">Seu Emoji de Perfil</label>
                <div className="text-center mb-4 text-7xl">
                  {editForm.profilePic || currentUser.profilePic}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {profilePicOptions.map(pic => (
                    <button
                      key={pic}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, profilePic: pic })}
                      className={`text-3xl p-2 rounded-lg transition-all ${
                        (editForm.profilePic || currentUser.profilePic) === pic 
                          ? 'bg-orange-500 scale-110' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {pic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome de Usuário */}
              <div>
                <label className="block text-amber-100 text-sm font-bold mb-2">Nome de Usuário</label>
                <input
                  type="text"
                  value={editForm.username !== undefined ? editForm.username : currentUser.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full bg-white/10 border-2 border-orange-400/50 rounded-lg px-4 py-3 text-white"
                />
              </div>

              {/* Info */}
              <div className="bg-white/5 border border-orange-400/30 rounded-xl p-4">
                <p className="text-amber-100 text-sm mb-2">📊 Sua Classificação Atual</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-orange-300">{currentUser.leaguePoints} pontos</p>
                    <p className="text-amber-100 text-sm">Posição na Cabra's League</p>
                  </div>
                  {currentUser.champion && (
                    <div className="text-5xl">👑</div>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditProfile(false)}
                  className="flex-1 bg-red-600/80 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==================== TELA LEAGUE ====================
  if (screen === 'league') {
    const sortedUsers = [...users].sort((a, b) => b.leaguePoints - a.leaguePoints);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 font-['Fredoka']"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px)`,
        }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Righteous&display=swap');
        `}</style>

        {/* Header */}
        <header className="bg-black/40 backdrop-blur-md border-b border-orange-400/40 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="font-['Righteous'] text-3xl text-amber-50">👑 Cabra's League (Mensal)</h1>
            <button
              onClick={() => setScreen('home')}
              className="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-lg"
            >
              ← Voltar
            </button>
          </div>
        </header>

        {/* Leaderboard */}
        <main className="max-w-6xl mx-auto p-6">
          <div className="space-y-2">
            {sortedUsers.map((user, idx) => (
              <div
                key={user.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                  user.id === currentUser.id
                    ? 'bg-orange-500/30 border-orange-400'
                    : 'bg-black/40 border-orange-400/30 hover:bg-black/50'
                }`}
              >
                {/* Posição */}
                <div className="flex-shrink-0 w-12 text-center">
                  {idx === 0 && <span className="font-['Righteous'] text-2xl">🥇</span>}
                  {idx === 1 && <span className="font-['Righteous'] text-2xl">🥈</span>}
                  {idx === 2 && <span className="font-['Righteous'] text-2xl">🥉</span>}
                  {idx > 2 && <span className="font-['Righteous'] text-xl text-amber-100">{idx + 1}º</span>}
                </div>

                {/* Perfil */}
                <div className="flex-shrink-0 text-4xl">{user.profilePic}</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-amber-50 font-bold text-lg truncate">{user.username}</p>
                    {user.champion && <span className="text-xl">👑</span>}
                  </div>
                  <p className="text-orange-300 text-sm">{user.wins} vitórias</p>
                </div>

                {/* Pontos */}
                <div className="text-right">
                  <p className="text-orange-300 font-['Righteous'] text-2xl">{user.leaguePoints}</p>
                  <p className="text-amber-100 text-sm">pontos</p>
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="mt-8 bg-black/40 backdrop-blur-md border-2 border-amber-500/40 rounded-2xl p-6">
            <h3 className="font-['Righteous'] text-xl text-amber-50 mb-3">🏆 Sobre a Cabra's League</h3>
            <ul className="space-y-2 text-amber-100">
              <li>✅ Competição mensal com reset de pontos</li>
              <li>✅ +10 pontos por vitória em dupla</li>
              <li>✅ Top 1 ganha INSÍGNIA DE CAMPEÃO permanente 👑</li>
              <li>✅ Sua classificação aparece no seu perfil</li>
            </ul>
          </div>
        </main>
      </div>
    );
  }

  // ==================== TELA JOGO ====================
  if (screen === 'game' && gameState) {
    return (
      <div className="h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 flex flex-col font-['Fredoka']"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px)`,
        }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Righteous&display=swap');
          .chat-container { overflow-y: auto; }
        `}</style>

        {/* Header do Jogo */}
        <header className="bg-black/40 backdrop-blur-md border-b border-orange-400/40 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="font-['Righteous'] text-xl text-amber-50">
              🎮 Rodada {gameState.round}
            </div>
            <div className="flex gap-8 text-center">
              <div>
                <p className="text-amber-100 text-sm">Seu Time</p>
                <p className="text-2xl font-bold text-orange-300">
                  {gameState.score.team1}
                </p>
              </div>
              <div className="text-amber-100 text-xl">vs</div>
              <div>
                <p className="text-amber-100 text-sm">Adversários</p>
                <p className="text-2xl font-bold text-red-400">
                  {gameState.score.team2}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setGameState(null);
                setScreen('home');
              }}
              className="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-lg"
            >
              ← Sair
            </button>
          </div>
        </header>

        <main className="flex-1 flex gap-4 max-w-7xl mx-auto w-full p-4 overflow-hidden">
          {/* Área do Jogo */}
          <div className="flex-1 flex flex-col">
            {/* Jogadores */}
            <div className="bg-black/40 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-6 mb-4">
              <h3 className="font-['Righteous'] text-amber-50 mb-4">Jogadores</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-4">
                  <p className="text-amber-100 text-sm mb-2">Seu Time</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{currentUser.profilePic}</span>
                      <div>
                        <p className="text-amber-50 font-bold">{gameState.playerName}</p>
                        <p className="text-orange-300 text-sm">(Você)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-3xl">🤝</span>
                      <p className="text-amber-50 font-bold">{gameState.partnerName}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-600/20 border border-red-500 rounded-lg p-4">
                  <p className="text-amber-100 text-sm mb-2">Adversários</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">⚔️</span>
                      <p className="text-amber-50 font-bold">{gameState.opponent1Name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-3xl">⚔️</span>
                      <p className="text-amber-50 font-bold">{gameState.opponent2Name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulação do Jogo */}
            <div className="bg-black/40 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl p-6 flex-1 flex flex-col">
              <div className="text-center py-12 flex-1 flex flex-col justify-center items-center">
                <div className="text-7xl mb-4">🎲🁢</div>
                <p className="text-amber-100 text-lg mb-8">Jogo em Progresso...</p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setGameState({
                        ...gameState,
                        score: { team1: gameState.score.team1 + 1, team2: gameState.score.team2 }
                      });
                      setChatMessages(prev => [...prev, { 
                        type: 'system', 
                        text: `Seu time marcou 1 ponto!` 
                      }]);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-8 rounded-lg"
                  >
                    Seu Time Marca
                  </button>
                  <button
                    onClick={() => {
                      setGameState({
                        ...gameState,
                        score: { team1: gameState.score.team1, team2: gameState.score.team2 + 1 }
                      });
                      setChatMessages(prev => [...prev, { 
                        type: 'system', 
                        text: `Adversários marcaram 1 ponto!` 
                      }]);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-lg"
                  >
                    Adversários Marcam
                  </button>
                  <button
                    onClick={handleWinGame}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded-lg mt-4"
                  >
                    Vitória! 🎉
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat + Emotes */}
          <div className="w-80 flex flex-col bg-black/40 backdrop-blur-md border-2 border-orange-400/40 rounded-2xl overflow-hidden">
            {/* Mensagens */}
            <div className="chat-container flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-sm ${
                    msg.type === 'system'
                      ? 'bg-amber-600/30 text-amber-100 text-center italic'
                      : msg.isEmote
                      ? 'bg-white/10 text-center text-2xl'
                      : 'bg-white/10 text-amber-50'
                  }`}
                >
                  {msg.type === 'system' ? (
                    msg.text
                  ) : msg.isEmote ? (
                    msg.text
                  ) : (
                    <>
                      <span className="font-bold text-orange-300">{msg.author}</span>
                      <span className="text-amber-100 ml-2">{msg.text}</span>
                      <span className="text-amber-100/50 text-xs ml-2">{msg.timestamp}</span>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Emotes */}
            <div className="border-t border-orange-400/40 p-2 flex gap-1 flex-wrap">
              {emotes.map(emote => (
                <button
                  key={emote.id}
                  onClick={() => {
                    setChatMessages(prev => [...prev, {
                      author: currentUser.username,
                      text: emote.emoji,
                      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                      isEmote: true,
                    }]);
                  }}
                  title={emote.label}
                  className="text-2xl p-2 hover:bg-white/20 rounded-lg transition"
                >
                  {emote.emoji}
                </button>
              ))}
            </div>

            {/* Input Chat */}
            <form onSubmit={handleSendMessage} className="border-t border-orange-400/40 p-3 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mensagem..."
                maxLength="50"
                className="flex-1 bg-white/10 border border-orange-400/50 rounded-lg px-3 py-2 text-white text-sm placeholder-amber-200/50 focus:outline-none focus:border-orange-400"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return null;
}