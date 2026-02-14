/**
 * CanvasCollaborationLayer
 * Renders collaborator cursors and selection locks
 * 
 * Separated from ExcalidrawCanvas to keep it focused
 */

import CollaboratorCursor from '../islands/CollaboratorCursor';
import SelectionLockOverlay from '../islands/SelectionLockOverlay';

interface Cursor {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
}

interface CanvasCollaborationLayerProps {
  cursors: Cursor[];
  activeUsers: number;
}

export default function CanvasCollaborationLayer({
  cursors,
  activeUsers,
}: CanvasCollaborationLayerProps) {
  return (
    <>
      {/* Collaborator Cursors */}
      {cursors.map((cursor) => (
        <CollaboratorCursor
          key={cursor.id}
          x={cursor.x}
          y={cursor.y}
          color={cursor.color}
          name={cursor.name}
        />
      ))}
      
      {/* Selection Lock Overlay (when someone else is editing) */}
      <SelectionLockOverlay />
      
      {/* Active Users Indicator */}
      {activeUsers > 1 && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 12,
          background: 'rgba(99, 102, 241, 0.9)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 500,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ 
            width: 8, 
            height: 8, 
            background: '#4ade80', 
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
          }} />
          {activeUsers} users active
        </div>
      )}
    </>
  );
}
