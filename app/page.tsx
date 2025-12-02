import MusicPlayer from "./component/MusicPlayer";

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">YouTube Music Player</h1>

      <section>
        <div className="grid gap-4">
          <div className="col-span-3 h-full ">
            <MusicPlayer />
          </div>
        </div>
      </section>
    </div>
  );
}
