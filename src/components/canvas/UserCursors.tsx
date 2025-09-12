import React from 'react';
import { Layer, Circle, Text } from 'react-konva';

interface User {
  id: string;
  name: string;
  cursor?: { x: number; y: number };
  color: string;
}

interface UserCursorsProps {
  users: Map<string, User>;
  currentUserId: string;
  viewport: { x: number; y: number; scale: number };
}

export const UserCursors: React.FC<UserCursorsProps> = ({ users, currentUserId, viewport }) => {
  return (
    <Layer>
      {Array.from(users.values())
        .filter(user => user.id !== currentUserId && user.cursor)
        .map(user => (
          <React.Fragment key={user.id}>
            <Circle
              x={user.cursor!.x}
              y={user.cursor!.y}
              radius={6 / viewport.scale}
              fill={user.color}
              stroke="white"
              strokeWidth={2 / viewport.scale}
            />
            <Text
              x={user.cursor!.x + 15 / viewport.scale}
              y={user.cursor!.y - 10 / viewport.scale}
              text={user.name}
              fontSize={12 / viewport.scale}
              fill={user.color}
              fontStyle="bold"
            />
          </React.Fragment>
        ))}
    </Layer>
  );
};