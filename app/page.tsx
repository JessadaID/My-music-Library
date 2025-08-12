import Addsong from "./component/Addsong";
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
            <img src="./y/y-2.jfif" alt="" width={300}/>
          </div>
        </div>
      </section>
    </div>
  );
}
