import { useState } from "react";
import CanvasControls from "./CanvasControls";
import AIChatPanel from "./AIChatPanel";
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
            <AIChatPanel isOpen={isChatOpen} onClose={handleCloseChat} />
            <MyAssetsPanel isOpen={isAssetsOpen} onClose={handleCloseAssets} />
        </>
    );
}
