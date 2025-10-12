import React from 'react';
import { Check, Clock, UserCheck, Send } from 'lucide-react';

const statusConfig = {
  Submitted: { icon: Send, text: 'แจ้งเรื่องแล้ว', color: 'text-blue-400' },
  Assigned: { icon: UserCheck, text: 'มอบหมายงานแล้ว', color: 'text-purple-400' },
  'In Progress': { icon: Clock, text: 'กำลังดำเนินการ', color: 'text-yellow-400' },
  Completed: { icon: Check, text: 'เสร็จสิ้น', color: 'text-green-400' },
};

/**
 * A component to display the timeline of a ticket's status.
 * @param {{ ticket: object }} props - The ticket object containing logs.
 */
function TicketStatusTracker({ ticket }) {
  // Extract unique status change logs, keeping the first occurrence of each status
  const statusLogs = ticket.logs
    .filter(log => log.status) // Filter only logs that are status changes
    .reduce((acc, current) => {
      // If we haven't seen this status before, add it to our accumulator
      if (!acc.some(item => item.status === current.status)) {
        acc.push(current);
      }
      return acc;
    }, []);

  // Ensure 'Submitted' is always the first status if it exists in the logs
  const submittedLogIndex = statusLogs.findIndex(log => log.status === 'Submitted');
  if (submittedLogIndex > 0) {
    const [submittedLog] = statusLogs.splice(submittedLogIndex, 1);
    statusLogs.unshift(submittedLog);
  }

  const currentStatusIndex = Object.keys(statusConfig).indexOf(ticket.status);

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-lg mb-4 text-slate-800 dark:text-white">ไทม์ไลน์สถานะ</h4>
      <div className="flex flex-col">
        {statusLogs.map((log, index) => {
          const config = statusConfig[log.status];
          if (!config) return null;

          const Icon = config.icon;
          const isLast = index === statusLogs.length - 1;
          const isActive = ticket.status === log.status || Object.keys(statusConfig).indexOf(log.status) < currentStatusIndex;

          return (
            <div key={index} className="flex">
              {/* Icon and Vertical Line */}
              <div className="flex flex-col items-center mr-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isActive ? config.color.replace('text', 'bg') + '/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? config.color : 'text-slate-500'}`} />
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-12 mt-2 ${isActive ? config.color.replace('text', 'bg') + '/50' : 'bg-slate-200 dark:bg-slate-600'}`}></div>
                )}
              </div>
              {/* Text Content */}
              <div className="pt-1.5">
                <p className={`font-semibold ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{config.text}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString('th-TH')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TicketStatusTracker;
