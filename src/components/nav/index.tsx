import { INavConfig } from "@/interface/test";
import Link from "next/link";
import './index.css';

const Nav = ({ posts }: { posts: INavConfig[] }) => {
  return (
    <nav>
      <ul className="nav-ul">
        {posts.map((post) => (
          <li key={post.id} >
            <Link href={`/${post.slug}`}>
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Nav;
