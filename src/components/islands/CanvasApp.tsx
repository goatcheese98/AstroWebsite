import { useState } from "react";
import CanvasControls from "./CanvasControls";
// import AIChatPanel from "./AIChatPanel"; // Original component (backup)
import { AIChatContainer } from "../ai-chat"; // New enterprise component
import MyAssetsPanel from "./MyAssetsPanel";

export default function CanvasApp() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isAssetsOpen, setIsAssetsOpen] = useState(false);

    const handleOpenChat = () => {
        setIsChatOpen(true);
        setIsAssetsOpen(false); // Close assets if open
    };

    const handleOpenAssets = () => {
        setIsAssetsOpen(true);
        setIsChatOpen(false); // Close chat if open
    };

    const handleCloseChat = () => {
        setIsChatOpen(false);
    };

    const handleCloseAssets = () => {
        setIsAssetsOpen(false);
    };

    return (
        <>
            <CanvasControls
                onOpenChat={handleOpenChat}
                onOpenAssets={handleOpenAssets}
                isChatOpen={isChatOpen}
                isAssetsOpen={isAssetsOpen}
            />
            {/* Use new AIChatContainer with element selection feature */}
            <AIChatContainer isOpen={isChatOpen} onClose={handleCloseChat} />
            
            {/* Original component (backup) */}
            {/* <AIChatPanel isOpen={isChatOpen} onClose={handleCloseChat} /> */}
            
            <MyAssetsPanel isOpen={isAssetsOpen} onClose={handleCloseAssets} />
        </>
    );
}
