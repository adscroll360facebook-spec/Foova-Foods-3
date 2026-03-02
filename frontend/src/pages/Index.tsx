import Hero from "@/components/Hero";
import FeaturedProducts from "@/components/FeaturedProducts";
import About from "@/components/About";
import Offers from "@/components/Offers";
import OfferBanners from "@/components/OfferBanners";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import CouponBanner from "@/components/CouponBanner";

const Index = () => {
  return (
    <main>
      <CouponBanner />
      <Hero />
      <OfferBanners />
      <FeaturedProducts />
      <About />
      <Offers />
      <Testimonials />
      <Contact />
    </main>
  );
};

export default Index;
