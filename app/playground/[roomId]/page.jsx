import PlaygroundRoom from '@/app/components/playground/PlaygroundRoom';

export const metadata = { title: 'Live Playground | BroCode' };

export default function PlaygroundRoomPage({ params }) {
  return <PlaygroundRoom roomId={params.roomId} />;
}
