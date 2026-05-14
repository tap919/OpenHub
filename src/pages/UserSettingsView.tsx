import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Key, Shield, User, Globe, Bell, Mail, Plus, Trash2, CheckCircle2, AlertTriangle, Fingerprint, Lock, ShieldCheck, Terminal, Cpu, Clock, Bot, PlusCircle, UploadCloud } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function UserSettingsView() {
  const { currentUser, sshKeys, fetchSSHKeys, addSSHKey, deleteSSHKey } = useStore();
  const [activeTab, setActiveTab] = useState('ssh-keys');
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKey, setNewKey] = useState({ title: '', key: '' });

  useEffect(() => {
    fetchSSHKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSSHKey(newKey.title, newKey.key);
    setIsAddingKey(false);
    setNewKey({ title: '', key: '' });
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar */}
      <div className="w-full md:w-64 space-y-1">
        <div className="px-3 py-4 mb-4 flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl">
           <img src={currentUser.avatarUrl} className="w-12 h-12 rounded-full border-2 border-blue-500 shadow-xl shadow-blue-500/20" alt="" />
           <div className="overflow-hidden">
              <div className="text-white text-sm font-black truncate">{currentUser.username}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Local Admin</div>
           </div>
        </div>
        
        <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
          <User className="w-4 h-4 mr-3" /> Public Profile
        </button>
        <button onClick={() => setActiveTab('ssh-keys')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'ssh-keys' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
          <Key className="w-4 h-4 mr-3" /> SSH and GPG keys
        </button>
        <button onClick={() => setActiveTab('security')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
          <Shield className="w-4 h-4 mr-3" /> Password & Authentication
        </button>
        <button onClick={() => setActiveTab('emails')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'emails' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
          <Mail className="w-4 h-4 mr-3" /> Emails
        </button>
        <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
          <Bell className="w-4 h-4 mr-3" /> Notifications
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 industrial-card overflow-hidden self-start min-h-[600px]">
        {activeTab === 'profile' && (
          <div className="p-8 space-y-8 animate-in fade-in duration-300">
            <div className="border-b border-white/5 pb-6">
              <h2 className="text-2xl font-industrial text-white tracking-tight">Operator Profile</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage your identity across the OpenHub node network.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="space-y-6 flex-1">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Common Name</label>
                    <input type="text" defaultValue={currentUser.username} className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Identity Token / Email</label>
                    <input type="email" defaultValue={currentUser.username + "@openhub.internal"} className="w-full bg-black/40 border border-gray-800 rounded-sm px-4 py-2 text-sm text-gray-500 font-mono" readOnly />
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Identities are locked by the OpenHub LDAP service.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Directive / Bio</label>
                    <textarea placeholder="Specify operational directives..." className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-2 text-sm text-white focus:border-orange-500 outline-none h-24 transition-colors" />
                  </div>
                </div>
                <button className="bg-white text-black font-black px-6 py-2 text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg">
                  Archive Profile
                </button>
              </div>

              <div className="w-full md:w-64 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Optical Signature</label>
                <div className="relative group overflow-hidden rounded-sm border border-gray-700 p-1 bg-black/40">
                   <img src={currentUser.avatarUrl} className="w-full aspect-square object-cover grayscale hover:grayscale-0 transition-all duration-500" alt="" />
                   <div className="absolute inset-0 bg-orange-500/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <UploadCloud className="w-8 h-8 text-black mb-2 animate-bounce" />
                      <span className="text-black text-[10px] font-black uppercase tracking-widest">Deploy Avatar</span>
                   </div>
                </div>
                <p className="text-[9px] text-gray-600 font-mono text-center uppercase tracking-tighter">RAW, PNG, GIF // ENCRYPTED_BLOB_STORE</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ssh-keys' && (
          <div className="p-8 space-y-10 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div>
                <h2 className="text-2xl font-industrial text-white tracking-tight">SSH and GPG Architecture</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Authorized keys for secure Git transport and commit validation.</p>
              </div>
              <button 
                onClick={() => setIsAddingKey(true)}
                className="bg-orange-500 text-black px-6 py-2 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" /> Inject New Key
              </button>
            </div>

            {isAddingKey && (
              <div className="bg-black border border-gray-800 rounded-sm p-6 animate-in zoom-in-95 duration-200">
                <form onSubmit={handleAddKey} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Identifier</label>
                    <input 
                      required
                      value={newKey.title}
                      onChange={e => setNewKey({...newKey, title: e.target.value})}
                      placeholder="e.g. WORKSTATION-A1"
                      className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-2 text-sm text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Key Data (Public)</label>
                    <textarea 
                      required
                      value={newKey.key}
                      onChange={e => setNewKey({...newKey, key: e.target.value})}
                      placeholder="Begins with 'ssh-rsa' or similar cryptographic prefix..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-2 text-sm text-white font-mono focus:border-orange-500 outline-none h-32"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button type="submit" className="flex-1 bg-white text-black font-black py-2 text-xs uppercase tracking-widest hover:bg-orange-500 transition-all">Submit Access Ticket</button>
                    <button type="button" onClick={() => setIsAddingKey(false)} className="px-6 py-2 border border-gray-700 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-white/5">Abort</button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {sshKeys.length === 0 ? (
                <div className="text-center py-16 bg-black/40 rounded-sm border-dashed border border-gray-800">
                   <Key className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                   <div className="text-gray-500 font-black uppercase tracking-widest text-xs">No keys detected in keystore</div>
                   <div className="text-[10px] text-gray-600 font-mono mt-2 uppercase tracking-tighter">Please provide a public key for Git authentication.</div>
                </div>
              ) : (
                sshKeys.map(key => (
                  <div key={key.id} className="group p-6 industrial-card hover:bg-white/5 transition-all flex items-start justify-between">
                    <div className="flex items-start space-x-5">
                      <div className="p-3 rounded-sm bg-gray-900 border border-gray-800 text-gray-500 group-hover:text-orange-500 transition-colors">
                        <Key className="w-6 h-6 border-b-2 border-transparent group-hover:border-orange-500 pb-1" />
                      </div>
                      <div>
                        <h4 className="text-white font-industrial text-xl leading-tight">{key.title}</h4>
                        <div className="mt-2 flex items-center">
                           <span className="text-[10px] font-mono text-gray-500 break-all max-w-[400px] truncate block px-2 py-1 bg-black/60 border border-white/5 rounded-sm">{key.key}</span>
                        </div>
                        <div className="mt-3 text-[10px] text-gray-600 font-black uppercase tracking-widest flex items-center">
                           <Clock className="w-3 h-3 mr-2" /> Timestamp: {formatDistanceToNow(new Date(key.createdAt))} ago
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteSSHKey(key.id)}
                      className="p-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-sm transition-all border border-transparent hover:border-red-500/20"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-sm flex items-start space-x-4">
               <div className="p-2 bg-blue-500/10 rounded-sm text-blue-500 border border-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Protocol Recommendation</h4>
                  <p className="text-[10px] text-blue-300/70 mt-1 font-bold uppercase tracking-tight leading-relaxed">Signature verification is disabled. We mandate GPG or SSH signing for all production deployments to enforce identity integrity.</p>
               </div>
            </div>
          </div>
        )}

        {/* Other tabs remain stubbed for visual polish */}
        {activeTab !== 'ssh-keys' && activeTab !== 'profile' && (
           <div className="p-16 text-center space-y-6">
              <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-700 animate-pulse">
                 <Terminal className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                 <h3 className="font-industrial text-2xl text-white uppercase">{activeTab} MODULE</h3>
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">This subsystem is under active construction by the OpenHub engineering collective.</p>
              </div>
              <button 
                onClick={() => setActiveTab('ssh-keys')} 
                className="text-orange-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
              >
                &lt;&lt; Return to Keystore
              </button>
           </div>
        )}
      </div>
    </div>
  );
}
