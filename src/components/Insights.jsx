import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalesChart = ({ salesData }) => {
  if (!salesData || salesData.length === 0) {
    return (
      <div className="text-center text-slate-400 py-6">
        <p>No hay datos de ventas para mostrar.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={salesData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="ventas" fill="#8884d8" name="Ventas" />
        <Bar dataKey="stock" fill="#82ca9d" name="Stock" />
      </BarChart>
    </ResponsiveContainer>
  );
};


const InsightsDashboard = ({ products }) => {
  const salesData = products.map(p => ({
    name: p.name,
    ventas: p.sales,
    stock: p.stock
  }));

  return (
    <div className="mt-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">
          Visión General de Productos
        </h3>
        <SalesChart salesData={salesData} />
      </div>
    </div>
  );
};

export default InsightsDashboard;