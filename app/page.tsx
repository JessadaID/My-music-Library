import Addsong from "./component/Addsong";
import TransImg from "./component/transImg";

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">YouTube Music Player</h1>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-3 h-full ">
            <Addsong />
          </div>
          <div className="col-span-1 flex justify-center items-center">
            <TransImg />
          </div>
        </div>
      </section>
    </div>
  );
}
