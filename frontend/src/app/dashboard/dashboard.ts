import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface DashboardStats {
  totalClients: number;
  activeCases: number;
  todayAppointments: number;
  monthlyRevenue: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  stats: DashboardStats = {
    totalClients: 0,
    activeCases: 0,
    todayAppointments: 0,
    monthlyRevenue: 0
  };

  private apiUrl: string;

  constructor(private http: HttpClient) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.apiUrl = `http://${host}:3005/api/dashboard/stats`;
  }

  ngOnInit() {
    this.fetchStats();
  }

  fetchStats() {
    this.http.get<DashboardStats>(this.apiUrl).subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Error fetching dashboard stats:', err)
    });
  }
}
