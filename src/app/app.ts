import { CommonModule } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';

interface CateringPackage {
  id: number;
  name: string;
  pax: string;
  headline: string;
  description: string;
  price: string;
  inclusions: string[];
  popular?: boolean;
}

interface Equipment {
  id: number;
  name: string;
  icon: string;
}

interface Testimonial {
  id: number;
  name: string;
  eventType: string;
  quote: string;
}

interface Location {
  city: string;
  address: string;
  phone: string[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatChipsModule, MatToolbarModule, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);

  protected readonly title = signal('Mess Catering');

  isBookingRoute() {
    return this.router.url.includes('/booking');
  }

  protected readonly navLinks = [
    { label: 'Home', section: 'home' },
    { label: 'Packages', section: 'packages' },
    { label: 'Equipment', section: 'equipment' },
    { label: 'About', section: 'about' },
    { label: 'Contact', section: 'contact' }
  ];

  protected readonly steps = [
    {
      title: 'Choose a Package',
      text: 'Browse catering and equipment bundles that match your guest count and event style.'
    },
    {
      title: 'Confirm Your Equipment',
      text: 'Review what is included so your event setup is complete before booking.'
    },
    {
      title: 'We Deliver & Set Up',
      text: 'Our team handles delivery, arrangement, and on-site setup for a seamless event.'
    }
  ];

  protected readonly packages: CateringPackage[] = [
    {
      id: 1,
      name: 'Silver Package',
      pax: '50 pax',
      headline: 'Practical catering for intimate gatherings.',
      description: 'Buffet service paired with the core equipment you need for a smooth event.',
      price: 'PHP 18,000',
      inclusions: ['Buffet for 50 pax', '5 round tables', '50 chairs', 'Cutlery set']
    },
    {
      id: 2,
      name: 'Gold Package',
      pax: '100 pax',
      headline: 'A balanced package for weddings and milestones.',
      description: 'Includes premium buffet service and a more complete equipment bundle.',
      price: 'PHP 34,000',
      inclusions: ['Buffet for 100 pax', '10 round tables', '100 chairs', 'Umbrella stands', 'Cutlery set'],
      popular: true
    },
    {
      id: 3,
      name: 'Platinum Package',
      pax: '150 pax',
      headline: 'Elevated plated service for signature celebrations.',
      description: 'A polished setup with premium service, styling, and full table presentation.',
      price: 'PHP 58,000',
      inclusions: ['Plated dinner for 150 pax', 'Full table setup', 'Premium cutlery', 'Centerpieces']
    }
  ];

  protected readonly equipment: Equipment[] = [
    { id: 1, name: 'Round Tables', icon: 'Table' },
    { id: 2, name: 'Chairs', icon: 'Seating' },
    { id: 3, name: 'Umbrellas', icon: 'Shade' },
    { id: 4, name: 'Cutlery Sets', icon: 'Flatware' },
    { id: 5, name: 'Serving Stations', icon: 'Service' },
    { id: 6, name: 'Linens', icon: 'Fabric' }
  ];

  protected readonly testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Meljam Torrecampo',
      eventType: 'Wedding Reception',
      quote: 'Mess Catering made our reception seamless. The package details were clear, and the service felt premium.'
    },
    {
      id: 2,
      name: 'Isaac Clint Beron',
      eventType: 'Corporate Gala',
      quote: 'We booked quickly and had every inclusion explained upfront. The event setup was organized and elegant.'
    },
    {
      id: 3,
      name: 'Jhon Carlo Panzo',
      eventType: 'Birthday Celebration',
      quote: 'The food and equipment package was exactly what we needed. It felt polished without being complicated.'
    }
  ];

  protected readonly equipmentIcons: Record<string, string> = {
    Table: '/table.png',
    Seating: '/chair.png',
    Shade: '/umbrellas.png',
    Flatware: '/cutlery-sets.png',
    Service: '/serving-station.png',
    Fabric: '/linen.png'
  };

  protected readonly locations: Location[] = [
    {
      city: 'Dulag, Leyte',
      address: 'Brgy. Combis, Dulag, Leyte',
      phone: ['(053) 888 9344', '09385015330']
    },
    {
      city: 'Bulacan',
      address: 'Plaridel, Bulacan',
      phone: ['(053) 888 9344', '09385015330', '09704559661']
    }
  ];

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
