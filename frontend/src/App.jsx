import React from 'react';
import ChatBox from './components/ChatBox';
import './index.css';

function App() {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <ChatBox />
    </div>
  );
}

export default App;
