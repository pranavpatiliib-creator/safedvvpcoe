-- Demo seed data for:
-- Event: SparkUp 2026
-- Questions: Name, Roll No, Division
-- Trial registrations: 50

begin;

with inserted_event as (
    insert into public.events (title, description, date, flyer_url)
    values (
        'SparkUp 2026',
        'Demo event created for registration testing and winner layout trial.',
        now() - interval '2 day',
        null
    )
    returning id
),
inserted_questions as (
    insert into public.questions (event_id, question, type, options, required)
    select
        e.id,
        q.question,
        q.type,
        q.options,
        q.required
    from inserted_event e
    cross join (
        values
            ('Name', 'text', null::text[], true),
            ('Roll No', 'text', null::text[], true),
            ('Division', 'select', array['A','B','C','D','E','F','G','H','I','J']::text[], true)
    ) as q(question, type, options, required)
    returning id, event_id, question
),
question_map as (
    select
        event_id,
        max(case when lower(question) = 'name' then id end) as name_qid,
        max(case when lower(question) = 'roll no' then id end) as roll_qid,
        max(case when lower(question) = 'division' then id end) as division_qid
    from inserted_questions
    group by event_id
)
insert into public.responses (event_id, answers)
select
    qm.event_id,
    jsonb_build_object(
        qm.name_qid::text, names.full_name,
        qm.roll_qid::text, format('SPK26%03s', gs.n),
        qm.division_qid::text, chr(64 + (((gs.n - 1) % 10) + 1))
    )
from question_map qm
cross join lateral generate_series(1, 50) as gs(n)
cross join lateral (
    values
        (case gs.n
            when 1 then 'Aarav Patil'
            when 2 then 'Ishita Shinde'
            when 3 then 'Vedant Jadhav'
            when 4 then 'Sai Joshi'
            when 5 then 'Pranali Bhosale'
            when 6 then 'Omkar Kale'
            when 7 then 'Rutuja Pawar'
            when 8 then 'Atharva More'
            when 9 then 'Sneha Chavan'
            when 10 then 'Yash Deshmukh'
            when 11 then 'Tanvi Gaikwad'
            when 12 then 'Rohit Kharat'
            when 13 then 'Anushka Kulkarni'
            when 14 then 'Soham Doke'
            when 15 then 'Tejaswini Kute'
            when 16 then 'Nikhil Thorat'
            when 17 then 'Sakshi Wagh'
            when 18 then 'Aditya Shete'
            when 19 then 'Pooja Auti'
            when 20 then 'Shreyas Nagare'
            when 21 then 'Mrunal Lanke'
            when 22 then 'Harshad Pansare'
            when 23 then 'Vaishnavi Rode'
            when 24 then 'Kunal Gadekar'
            when 25 then 'Shravani Gorde'
            when 26 then 'Siddharth Kolhe'
            when 27 then 'Aditi Ghule'
            when 28 then 'Pratiksha Tambe'
            when 29 then 'Abhishek Gite'
            when 30 then 'Neha Dhumal'
            when 31 then 'Mayur Shelke'
            when 32 then 'Kalyani Aher'
            when 33 then 'Saurabh Bende'
            when 34 then 'Komal Kakde'
            when 35 then 'Ritesh Mhaske'
            when 36 then 'Pallavi Hase'
            when 37 then 'Akshay Tupe'
            when 38 then 'Aishwarya Khedkar'
            when 39 then 'Rushikesh Gawali'
            when 40 then 'Dipali Dhakne'
            when 41 then 'Aniket Lawande'
            when 42 then 'Sonal Borude'
            when 43 then 'Tushar Kute'
            when 44 then 'Prajakta Bagul'
            when 45 then 'Swapnil Dhomse'
            when 46 then 'Rasika Chothe'
            when 47 then 'Shubham Munde'
            when 48 then 'Monali Sonawane'
            when 49 then 'Ganesh Pawar'
            else 'Priyanka Karale'
        end)
) as names(full_name);

commit;

-- Optional sample winner/event gallery data for the same event:
-- with target_event as (
--     select id
--     from public.events
--     where title = 'SparkUp 2026'
--     order by id desc
--     limit 1
-- )
-- insert into public.event_results (event_id, gallery_enabled, winners, gallery_images)
-- select
--     id,
--     true,
--     '[
--         {"rank":1,"name":"Aarav Patil"},
--         {"rank":2,"name":"Ishita Shinde"},
--         {"rank":3,"name":"Vedant Jadhav"}
--     ]'::jsonb,
--     '[
--         "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
--     ]'::jsonb
-- from target_event
-- on conflict (event_id) do update
-- set
--     gallery_enabled = excluded.gallery_enabled,
--     winners = excluded.winners,
--     gallery_images = excluded.gallery_images,
--     updated_at = now();
