import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $insertNodes, $isRangeSelection, $getSelection, COMMAND_PRIORITY_CRITICAL, createCommand, type LexicalCommand } from 'lexical';
import { useEffect, useRef } from 'react';
import { $createYouTubeNode } from '../nodes/YouTubeNode';
import { $createTweetNode } from '../nodes/TweetNode';

// Command to insert embeds programmatically
export const INSERT_YOUTUBE_COMMAND: LexicalCommand<string> = createCommand('INSERT_YOUTUBE_COMMAND');
export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand('INSERT_TWEET_COMMAND');

// Regex patterns for URL detection
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:\S*)/;
const TWITTER_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)(?:\?\S*)?/;

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
    const match = url.match(YOUTUBE_REGEX);
    return match ? match[1] : null;
}

/**
 * Extract tweet ID from Twitter/X URL
 */
export function extractTwitterId(url: string): string | null {
    const match = url.match(TWITTER_REGEX);
    return match ? match[1] : null;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
    return YOUTUBE_REGEX.test(url.trim());
}

/**
 * Check if a URL is a Twitter/X URL
 */
export function isTwitterUrl(url: string): boolean {
    return TWITTER_REGEX.test(url.trim());
}

/**
 * AutoEmbedPlugin - Automatically converts YouTube and Twitter URLs to embeds
 */
export default function AutoEmbedPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const processedPastedUrls = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Track recently pasted URLs to avoid duplicate processing
        const recentUrls = processedPastedUrls.current;
        
        // Clear the set periodically to prevent memory leaks
        const interval = setInterval(() => {
            recentUrls.clear();
        }, 5000);

        // Listen for text insertion (which happens after paste)
        const removeTextListener = editor.registerTextContentListener((text: string) => {
            const trimmedText = text.trim();
            
            // Skip if already processed
            if (recentUrls.has(trimmedText)) {
                return;
            }

            // Check for YouTube URL
            if (isYouTubeUrl(trimmedText)) {
                const videoId = extractYouTubeId(trimmedText);
                if (videoId) {
                    recentUrls.add(trimmedText);
                    
                    // Small delay to let the paste complete
                    setTimeout(() => {
                        editor.update(() => {
                            const selection = $getSelection();
                            if ($isRangeSelection(selection)) {
                                // Delete the pasted text
                                selection.extract();
                                
                                // Insert YouTube node
                                const youtubeNode = $createYouTubeNode(videoId);
                                $insertNodes([youtubeNode]);
                            }
                        });
                    }, 0);
                    return;
                }
            }

            // Check for Twitter/X URL
            if (isTwitterUrl(trimmedText)) {
                const tweetId = extractTwitterId(trimmedText);
                if (tweetId) {
                    recentUrls.add(trimmedText);
                    
                    setTimeout(() => {
                        editor.update(() => {
                            const selection = $getSelection();
                            if ($isRangeSelection(selection)) {
                                // Delete the pasted text
                                selection.extract();
                                
                                // Insert Tweet node
                                const tweetNode = $createTweetNode(tweetId);
                                $insertNodes([tweetNode]);
                            }
                        });
                    }, 0);
                    return;
                }
            }
        });

        // Register command for programmatic YouTube insertion
        const removeYouTubeCommand = editor.registerCommand(
            INSERT_YOUTUBE_COMMAND,
            (url: string) => {
                const videoId = extractYouTubeId(url);
                if (!videoId) {
                    console.warn('Invalid YouTube URL:', url);
                    return false;
                }

                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const youtubeNode = $createYouTubeNode(videoId);
                        $insertNodes([youtubeNode]);
                    }
                });
                return true;
            },
            COMMAND_PRIORITY_CRITICAL
        );

        const removeTweetCommand = editor.registerCommand(
            INSERT_TWEET_COMMAND,
            (url: string) => {
                const tweetId = extractTwitterId(url);
                if (!tweetId) {
                    console.warn('Invalid Twitter URL:', url);
                    return false;
                }

                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const tweetNode = $createTweetNode(tweetId);
                        $insertNodes([tweetNode]);
                    }
                });
                return true;
            },
            COMMAND_PRIORITY_CRITICAL
        );

        return mergeRegister(
            removeTextListener,
            removeYouTubeCommand,
            removeTweetCommand,
            () => clearInterval(interval),
        );
    }, [editor]);

    return null;
}
