import MusicPlayer from "./component/MusicPlayer";

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">YouTube Music Player</h1>

      <section className="min-w-0">
        <div className="grid gap-4 min-w-0">
          <div className="col-span-3 h-full min-w-0">
            <MusicPlayer />
          </div>
        </div>
      </section>
    </div>
  );
}
