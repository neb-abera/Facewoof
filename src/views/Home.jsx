import React from 'react';
import { Link } from 'react-router-dom';
import { FaBone, FaDog, FaRegCalendarAlt } from 'react-icons/fa';
import dogImage from '../assets/dog.jpg';

const features = [
  {
    icon: FaDog,
    title: 'Discover',
    body: 'Swipe through dogs near you, filtered by how far you are willing to travel.'
  },
  {
    icon: FaBone,
    title: 'Packs',
    body: 'Turn your matches into a pack and keep up with a shared feed.'
  },
  {
    icon: FaRegCalendarAlt,
    title: 'Playdates',
    body: 'Put a walk on the calendar and everyone in the pack sees it.'
  }
];

const Home = () => (
  <div className="flex min-h-screen w-screen max-lg:flex-col">
    <div className="relative w-[600px] shrink-0 max-lg:w-full max-lg:h-64">
      <img className="w-full h-full object-cover" src={dogImage} alt="A dog in a park" />
    </div>

    <div className="flex flex-col flex-1 justify-center px-12 py-16 space-y-8">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold">Facewoof</h1>
        <p className="text-lg opacity-80 max-w-xl">
          A place for dog owners to meet the dogs around them. Find a match, start a pack, schedule
          a playdate.
        </p>
      </div>

      <ul className="space-y-4 max-w-xl">
        {features.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start space-x-4">
            <Icon className="mt-1 text-2xl text-primary shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="opacity-75">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <Link to="/login" className="btn btn-primary btn-wide">
          Try the demo
        </Link>
      </div>
    </div>
  </div>
);

export default Home;
