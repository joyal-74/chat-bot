import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Server, Database, Terminal, Cpu, Send, Sparkles, Box } from 'lucide-react';

const ChatBox = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const { data } = await axios.post('/api/chat', { message: input });
            const botMessage = {
                role: 'assistant',
                content: data.reply,
                data: data.data,
                code: data.code,
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (err) {
            console.log(err);
            setMessages((prev) => [...prev, { role: 'assistant', content: "Infrastructure link failed. Please retry." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0c0c0c] text-zinc-100 font-sans">
            {/* Header - Industrial Yellow Branding */}
            <div className="px-30 py-4 border-b border-yellow-500/20 bg-[#0c0c0c]/80 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                        <Sparkles size={18} className="text-yellow-400" />
                    </div>
                    <span className="font-bold tracking-tight text-yellow-500 uppercase">Cloud Architect</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/5 rounded-full border border-yellow-500/10">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                    <span className="text-[10px] uppercase tracking-widest text-yellow-500/80 font-bold">System Online</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto py-4 px-30 md:py-8 md:px-30 space-y-8 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-3">
                        <Box size={40} strokeWidth={1} className="text-yellow-500/20" />
                        <p className="text-sm font-medium tracking-wide">Ready to provision infrastructure...</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[90%] md:max-w-[75%] shadow-2xl ${
                            msg.role === 'user' 
                                ? 'bg-yellow-500 text-black font-medium rounded-2xl rounded-tr-none px-5 py-3' 
                                : 'bg-[#141414] border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-none px-5 py-4'
                        }`}>
                            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                            {/* Resource Cards */}
                            {msg.data && msg.data.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {msg.data.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors group">
                                            <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-yellow-500/10 transition-colors">
                                                {item.type === 'EC2' ? <Cpu size={16} className="text-yellow-400" /> : <Database size={16} className="text-yellow-500" />}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="text-xs font-bold truncate text-zinc-200">{item.name}</div>
                                                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <span className="truncate">{item.region}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span className={item.status === 'running' ? 'text-yellow-500' : 'text-zinc-500'}>{item.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Terminal Code Block */}
                            {msg.code && (
                                <div className="mt-4 rounded-xl bg-black border border-yellow-500/20 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
                                        <div className="flex items-center gap-2">
                                            <Terminal size={12} className="text-yellow-500/50" />
                                            <span className="text-[10px] font-mono text-zinc-400">terraform_main.tf</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                                        </div>
                                    </div>
                                    <pre className="p-4 font-mono text-[11px] text-yellow-200/80 overflow-x-auto leading-relaxed">
                                        <code>{msg.code}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {loading && (
                    <div className="flex items-center gap-3 text-yellow-500/50 px-2">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tighter">Architecting solution...</span>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-linear-to-t from-black to-transparent">
                <form onSubmit={handleSend} className="max-w-6xl mx-auto relative group">
                    <input
                        className="w-full bg-[#141414] border border-zinc-800 rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all placeholder:text-zinc-700 text-zinc-200"
                        placeholder="Scale the database to t3.medium..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-900 disabled:text-zinc-700 text-black rounded-xl transition-all active:scale-95 flex items-center justify-center"
                    >
                        <Send size={18} strokeWidth={2.5} />
                    </button>
                </form>
                <p className="text-[10px] text-center mt-3 text-zinc-700 uppercase tracking-[0.2em] font-bold">
                    Terraform Engine v1.5.0 <span className="text-yellow-500/20">|</span> Encrypted Link
                </p>
            </div>
        </div>
    );
};

export default ChatBox;