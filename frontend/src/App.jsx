import ChatBox from './components/ChatBox';

function App() {
    return (
        <div className="h-screen w-screen bg-gray-950 text-white flex flex-col">
            {/* Main Chat Area */}
            <main className="flex-1 overflow-hidden">
                <ChatBox />
            </main>
        </div>
    );
}

export default App;